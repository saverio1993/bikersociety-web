#!/usr/bin/env python3
"""
Bot de Telegram para Biker Society — conecta con Claude (Opus 4.8) y, además de
chatear, puede gestionar el servidor EC2 mediante herramientas acotadas.

- Solo responde a los IDs de Telegram en la lista blanca (TELEGRAM_ALLOWED_IDS).
- Lee TODOS los secretos de variables de entorno (nada hardcodeado):
    TELEGRAM_TOKEN        token del bot (de @BotFather)
    TELEGRAM_ALLOWED_IDS  ids numéricos permitidos, separados por coma
    ANTHROPIC_API_KEY     clave de la API de Anthropic (la usa el SDK)
- Herramientas de servidor: estado, reiniciar un servicio (lista cerrada),
  desplegar la web (git pull), ver logs, y mandar un aviso push a los bikers.

Modelo: claude-opus-4-8 con pensamiento adaptativo (recomendado por el skill).
"""
import os
import json
import time
import html
import subprocess
import urllib.request
import urllib.parse

import anthropic

# ---------- Config (de entorno) ----------
TG_TOKEN = os.environ["TELEGRAM_TOKEN"]
ALLOWED = {s.strip() for s in os.environ.get("TELEGRAM_ALLOWED_IDS", "").split(",") if s.strip()}
TG_API = f"https://api.telegram.org/bot{TG_TOKEN}"
WEB_DIR = os.environ.get("BIKER_WEB_DIR", "/var/www/bikersociety")
NOTIFY_URL = os.environ.get("BIKER_NOTIFY_URL", "http://127.0.0.1:8090/notify")
NOTIFY_ORIGIN = os.environ.get("BIKER_NOTIFY_ORIGIN", "https://bikersociety.duckdns.org")
SERVICES = ["nginx", "bikersociety-notify", "bikersociety-avatar"]

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY del entorno

SYSTEM = (
    "Eres el asistente del servidor de Biker Society (una comunidad de motociclistas en Panamá). "
    "Hablas en español, claro y breve. Puedes conversar normalmente y también gestionar el servidor "
    "EC2 con las herramientas disponibles. Antes de acciones que cambian algo (reiniciar un servicio, "
    "desplegar, o mandar un aviso a todos los miembros), confirma de forma concisa qué vas a hacer si "
    "la petición es ambigua; si es clara, hazla y reporta el resultado. Nunca inventes resultados: usa "
    "las herramientas para obtener datos reales. Si algo falla, di exactamente qué falló."
)

TOOLS = [
    {"name": "server_status", "description": "Estado del servidor: servicios activos, disco, memoria y uptime.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "restart_service", "description": "Reinicia un servicio del servidor.",
     "input_schema": {"type": "object", "properties": {
         "service": {"type": "string", "enum": SERVICES, "description": "Servicio a reiniciar"}},
         "required": ["service"]}},
    {"name": "deploy_web", "description": "Despliega la última versión de la web (git pull en el servidor).",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "read_logs", "description": "Muestra las últimas líneas del log de un servicio.",
     "input_schema": {"type": "object", "properties": {
         "service": {"type": "string", "enum": SERVICES},
         "lines": {"type": "integer", "description": "Cuántas líneas (1-100)"}},
         "required": ["service"]}},
    {"name": "send_broadcast", "description": "Envía un aviso push a TODOS los miembros (úsalo con cuidado).",
     "input_schema": {"type": "object", "properties": {
         "title": {"type": "string"}, "body": {"type": "string"}},
         "required": ["title", "body"]}},
]


def sh(cmd, timeout=120):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return (out.stdout + out.stderr).strip() or "(sin salida)"
    except Exception as e:
        return f"ERROR ejecutando: {e}"


def run_tool(name, args):
    if name == "server_status":
        parts = ["=== Servicios ==="]
        for s in SERVICES:
            st = sh(["systemctl", "is-active", s])
            parts.append(f"{s}: {st}")
        parts.append("=== Disco ===\n" + sh(["df", "-h", "/"]))
        parts.append("=== Memoria ===\n" + sh(["free", "-m"]))
        parts.append("=== Uptime ===\n" + sh(["uptime"]))
        return "\n".join(parts)
    if name == "restart_service":
        svc = args.get("service")
        if svc not in SERVICES:
            return f"Servicio no permitido: {svc}"
        return sh(["sudo", "systemctl", "restart", svc]) + "\n-> " + sh(["systemctl", "is-active", svc])
    if name == "deploy_web":
        return sh(["git", "-C", WEB_DIR, "pull", "origin", "main"])
    if name == "read_logs":
        svc = args.get("service")
        if svc not in SERVICES:
            return f"Servicio no permitido: {svc}"
        lines = max(1, min(100, int(args.get("lines", 30))))
        return sh(["sudo", "journalctl", "-u", svc, "-n", str(lines), "--no-pager"])
    if name == "send_broadcast":
        title = (args.get("title") or "").strip()
        body = (args.get("body") or "").strip()
        if not title:
            return "Falta el título del aviso."
        data = json.dumps({"title": title, "body": body[:200], "kind": "telegram"}).encode()
        req = urllib.request.Request(NOTIFY_URL, data=data, method="POST",
                                     headers={"Content-Type": "application/json", "Origin": NOTIFY_ORIGIN})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return f"Aviso enviado (HTTP {r.status}): {r.read().decode()[:200]}"
        except Exception as e:
            return f"ERROR enviando aviso: {e}"
    return f"Herramienta desconocida: {name}"


# ---------- Telegram ----------
def tg(method, **params):
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(f"{TG_API}/{method}", data=data)
    with urllib.request.urlopen(req, timeout=70) as r:
        return json.loads(r.read().decode())


def send(chat_id, text):
    for i in range(0, len(text), 3900):  # Telegram corta en ~4096
        try:
            tg("sendMessage", chat_id=chat_id, text=text[i:i + 3900])
        except Exception as e:
            print("send error:", e)


HISTORY = {}  # chat_id -> lista de mensajes (memoria corta)


def ask_claude(chat_id, user_text):
    msgs = HISTORY.get(chat_id, [])
    msgs.append({"role": "user", "content": user_text})
    for _ in range(8):  # bucle agéntico acotado
        resp = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=4000,
            system=SYSTEM,
            thinking={"type": "adaptive"},
            output_config={"effort": "medium"},
            tools=TOOLS,
            messages=msgs,
        )
        msgs.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason != "tool_use":
            break
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                out = run_tool(block.name, block.input or {})
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": out[:6000]})
        msgs.append({"role": "user", "content": results})
    # Texto final
    text = "".join(b.text for b in resp.content if b.type == "text").strip() or "(sin respuesta)"
    HISTORY[chat_id] = msgs[-20:]  # recorta la memoria
    return text


def main():
    print("Bot de Biker Society iniciado. Allowed:", ALLOWED)
    offset = None
    while True:
        try:
            params = {"timeout": 50}
            if offset is not None:
                params["offset"] = offset
            upd = tg("getUpdates", **params)
            for u in upd.get("result", []):
                offset = u["update_id"] + 1
                msg = u.get("message") or u.get("edited_message")
                if not msg or "text" not in msg:
                    continue
                uid = str(msg["from"]["id"])
                chat_id = msg["chat"]["id"]
                if ALLOWED and uid not in ALLOWED:
                    send(chat_id, "🚫 No autorizado.")
                    print("rechazado uid", uid)
                    continue
                text = msg["text"].strip()
                if text in ("/start", "/help"):
                    send(chat_id, "🏍️ Asistente de Biker Society.\nEscríbeme normal para chatear, o pídeme:\n"
                                  "• estado del servidor\n• reiniciar <servicio>\n• desplegar la web\n• ver logs de <servicio>\n• manda un aviso: ...")
                    continue
                send(chat_id, "…")
                try:
                    send(chat_id, ask_claude(chat_id, text))
                except Exception as e:
                    send(chat_id, f"❌ Error: {e}")
                    print("claude error:", e)
        except Exception as e:
            print("loop error:", e)
            time.sleep(3)


if __name__ == "__main__":
    main()

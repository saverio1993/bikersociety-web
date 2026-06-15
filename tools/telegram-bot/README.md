# Bot de Telegram + Claude para Biker Society

Bot que vive en el EC2: chateas con Claude (Opus 4.8) por Telegram y, además,
puede gestionar el servidor (estado, reiniciar servicios, desplegar, ver logs,
mandar avisos). Bloqueado a tu(s) ID(s) de Telegram.

## Lo que necesitas crear TÚ (3 cosas)

1. **Bot de Telegram** → habla con **@BotFather**, `/newbot`, ponle nombre. Te da un **token**.
2. **Tu ID de Telegram** → habla con **@userinfobot**, te dice tu número de `Id`.
3. **API key de Anthropic** → console.anthropic.com → API Keys (⚠️ tiene costo por uso).

## Instalación en el EC2 (lo hace Claude Code por ti)

```bash
# 1. Código
sudo mkdir -p /opt/bikersociety/telegram-bot
sudo cp bot.py /opt/bikersociety/telegram-bot/
# 2. Dependencia
pip3 install --user anthropic    # o: sudo pip3 install anthropic
# 3. Secretos (rellénalos tú)
sudo cp telegram-bot.env.sample /opt/bikersociety/telegram-bot.env
sudo nano /opt/bikersociety/telegram-bot.env     # pega token, tu ID y la API key
sudo chmod 600 /opt/bikersociety/telegram-bot.env
# 4. Permiso para reiniciar servicios (sin contraseña, solo esos comandos):
echo 'ec2-user ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl restart bikersociety-notify, /usr/bin/systemctl restart bikersociety-avatar, /usr/bin/journalctl *' | sudo tee /etc/sudoers.d/biker-telegram
# 5. Servicio
sudo cp bikersociety-telegram.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bikersociety-telegram
sudo systemctl status bikersociety-telegram
```

## Seguridad
- Solo los IDs en `TELEGRAM_ALLOWED_IDS` pueden usarlo.
- Las herramientas están acotadas: reiniciar solo servicios de una lista cerrada, sin shell libre.
- Los secretos viven en `/opt/bikersociety/telegram-bot.env` (chmod 600), nunca en git.
- El uso de la API de Anthropic se factura por tokens.

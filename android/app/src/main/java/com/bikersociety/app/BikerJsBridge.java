package com.bikersociety.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.webkit.JavascriptInterface;

public class BikerJsBridge {

    private final Context ctx;

    public BikerJsBridge(Context context) {
        this.ctx = context;
        createNotifChannel();
    }

    // ── Canal de notificaciones ────────────────────────────────────────────
    private void createNotifChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    "biker_alarm",
                    "Recordatorios de ruta",
                    NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("Alarma 1 hora antes de la salida");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800});
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    // ── Notificación simple (badges, niveles, etc.) ────────────────────────
    @JavascriptInterface
    public void notify(String title, String body) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("bs.SIMPLE_NOTIF");
        i.putExtra("title", title);
        i.putExtra("body", body);
        i.putExtra("routeId", "");
        ctx.sendBroadcast(i);
    }

    // ── Programar alarma nativa vía AlarmManager ───────────────────────────
    @JavascriptInterface
    public void scheduleAlarm(String routeId, String routeName, long triggerAtMs) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("bs.ROUTE_ALARM");
        i.putExtra("routeId", routeId);
        i.putExtra("routeName", routeName);

        int reqCode = ("alarm_" + routeId).hashCode();
        PendingIntent pi = PendingIntent.getBroadcast(
                ctx, reqCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            // Fallback: alarma inexacta (puede llegar con pocos minutos de diferencia)
            am.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        }
    }

    // ── Cancelar alarma ────────────────────────────────────────────────────
    @JavascriptInterface
    public void cancelAlarm(String routeId) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("bs.ROUTE_ALARM");
        int reqCode = ("alarm_" + routeId).hashCode();
        PendingIntent pi = PendingIntent.getBroadcast(
                ctx, reqCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pi);
    }

    // ── Check si corre como APK nativo ────────────────────────────────────
    @JavascriptInterface
    public boolean isNative() {
        return true;
    }
}

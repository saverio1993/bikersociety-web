package com.bikersociety.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action   = intent.getAction();
        String routeId  = intent.getStringExtra("routeId");
        String routeName = intent.getStringExtra("routeName");
        String title    = intent.getStringExtra("title");
        String body     = intent.getStringExtra("body");

        boolean isAlarm = "bs.ROUTE_ALARM".equals(action);

        // Intent para abrir la app al tocar la notificación
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (isAlarm && routeId != null) {
            open.putExtra("alarm_route_id", routeId);
        }
        int reqCode = routeId != null ? ("notif_" + routeId).hashCode() : 0;
        PendingIntent pi = PendingIntent.getActivity(
                ctx, reqCode, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Sonido: usar el tono de alarma del sistema
        Uri alarmSound = isAlarm
                ? RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        if (alarmSound == null) {
            alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        }

        String notifTitle = isAlarm ? "🏍️ ¡Salida en 1 hora!" : (title != null ? title : "Biker Society");
        String notifBody  = isAlarm ? (routeName != null ? routeName : "Tu ruta sale pronto") : (body != null ? body : "");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, "biker_alarm")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(notifTitle)
                .setContentText(notifBody)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setPriority(isAlarm ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
                .setCategory(isAlarm ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_MESSAGE)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 800})
                .setSound(alarmSound)
                .setFullScreenIntent(pi, isAlarm); // muestra pantalla completa si el móvil está bloqueado

        if (isAlarm) {
            builder.setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        }

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            int id = isAlarm ? ("alarm_" + routeId).hashCode() : reqCode;
            nm.notify(id, builder.build());
        }
    }
}

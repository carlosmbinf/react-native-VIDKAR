package com.vidkar;

import android.content.Intent;
import android.util.Log;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

public class MyBackgroundService extends HeadlessJsTaskService {
    @Nullable
    @Override
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        return new HeadlessJsTaskConfig(
                "BackgroundService",
                null,
                5000, // Tiempo de ejecución antes de ser eliminado
                true // Permite ejecución con la pantalla apagada
        );
    }
}

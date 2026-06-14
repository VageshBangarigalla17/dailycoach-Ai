package com.dailycoach.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build

object BatteryOptimizationHelper {
    
    fun getOptimizationIntent(context: Context): Intent? {
        val manufacturer = Build.MANUFACTURER.lowercase()
        return when {
            manufacturer.contains("xiaomi") -> getXiaomiIntent()
            manufacturer.contains("huawei") -> getHuaweiIntent()
            manufacturer.contains("oppo") -> getOppoIntent()
            manufacturer.contains("vivo") -> getVivoIntent()
            manufacturer.contains("samsung") -> getSamsungIntent()
            else -> null
        }
    }

    private fun getXiaomiIntent(): Intent {
        val intent = Intent()
        intent.component = ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
        return intent
    }

    private fun getHuaweiIntent(): Intent {
        val intent = Intent()
        intent.component = ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
        return intent
    }

    private fun getOppoIntent(): Intent {
        val intent = Intent()
        intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
        return intent
    }

    private fun getVivoIntent(): Intent {
        val intent = Intent()
        intent.component = ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
        return intent
    }

    private fun getSamsungIntent(): Intent {
        val intent = Intent()
        intent.component = ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")
        return intent
    }
}

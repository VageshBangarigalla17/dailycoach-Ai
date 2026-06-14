package com.dailycoach.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Register the NotificationPlugin so React can call it via registerPlugin('NotificationService')
        registerPlugin(NotificationPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}

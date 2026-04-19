package expo.modules.cadetebackgroundtracking

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CadeteBackgroundTrackingModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CadeteBackgroundTracking")

    AsyncFunction("startTracking") { userId: String, meteorUrl: String? ->
      val context = requireContext()
      CadeteTrackingService.start(context, userId, meteorUrl)
      CadeteTrackingService.getStatus(context)
    }

    AsyncFunction("stopTracking") {
      val context = requireContext()
      CadeteTrackingService.stop(context)
      CadeteTrackingService.getStatus(context)
    }

    AsyncFunction("syncTracking") { enabled: Boolean, userId: String?, meteorUrl: String? ->
      val context = requireContext()
      CadeteTrackingService.sync(context, enabled, userId, meteorUrl)
      CadeteTrackingService.getStatus(context)
    }

    AsyncFunction("getStatus") {
      CadeteTrackingService.getStatus(requireContext())
    }
  }

  private fun requireContext(): Context {
    return requireNotNull(appContext.reactContext?.applicationContext) {
      "CadeteBackgroundTracking necesita un applicationContext disponible"
    }
  }
}

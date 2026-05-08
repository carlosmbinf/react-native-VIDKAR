package expo.modules.vidkarpip

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VidkarPipModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VidkarPip")

    AsyncFunction("setPlayerActive") { active: Boolean ->
      VidkarPipState.setPlayerActive(active)
      mapOf(
        "supported" to true,
        "playerActive" to VidkarPipState.isPlayerActive(),
        "inPictureInPicture" to VidkarPipState.isInPictureInPicture()
      )
    }

    AsyncFunction("getStatus") {
      mapOf(
        "supported" to true,
        "playerActive" to VidkarPipState.isPlayerActive(),
        "inPictureInPicture" to VidkarPipState.isInPictureInPicture()
      )
    }
  }
}

package expo.modules.vidkarpip

object VidkarPipState {
  @Volatile
  private var playerActive: Boolean = false

  @Volatile
  private var inPictureInPicture: Boolean = false

  fun setPlayerActive(active: Boolean) {
    playerActive = active
  }

  fun isPlayerActive(): Boolean = playerActive

  fun setInPictureInPicture(active: Boolean) {
    inPictureInPicture = active
  }

  fun isInPictureInPicture(): Boolean = inPictureInPicture
}

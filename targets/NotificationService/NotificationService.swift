import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?
  private var downloadTask: URLSessionDownloadTask?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent

    guard let bestAttemptContent,
          let imageURL = imageURL(from: request.content.userInfo) else {
      deliverBestAttempt()
      return
    }

    downloadTask = URLSession.shared.downloadTask(with: imageURL) { [weak self] temporaryURL, response, error in
      guard let self, let temporaryURL, error == nil else {
        self?.deliverBestAttempt()
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
            200..<300 ~= httpResponse.statusCode else {
        self.deliverBestAttempt()
        return
      }

      let fileExtension = self.imageFileExtension(for: httpResponse, url: imageURL)
      let targetURL = URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent("image-\(UUID().uuidString).\(fileExtension)")

      do {
        try FileManager.default.moveItem(at: temporaryURL, to: targetURL)
        let attachment = try UNNotificationAttachment(
          identifier: "image",
          url: targetURL,
          options: nil
        )
        bestAttemptContent.attachments = [attachment]
      } catch {
        print("[NotificationService] No se pudo preparar la imagen: \(error.localizedDescription)")
      }

      self.deliverBestAttempt()
    }
    downloadTask?.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    downloadTask?.cancel()
    deliverBestAttempt()
  }

  private func imageURL(from userInfo: [AnyHashable: Any]) -> URL? {
    let candidates: [Any?] = [
      (userInfo["body"] as? [String: Any])?["_richContent"].flatMap {
        ($0 as? [String: Any])?["image"]
      },
      (userInfo["data"] as? [String: Any])?["notificationImageUrl"],
      (userInfo["data"] as? [String: Any])?["imageUrl"],
      (userInfo["data"] as? [String: Any])?["image_url"],
      (userInfo["data"] as? [String: Any])?["image"],
      (userInfo["data"] as? [String: Any])?["attachmentUrl"],
      (userInfo["data"] as? [String: Any])?["attachment"],
      (userInfo["attachments"] as? [[String: Any]])?.first?["url"],
      userInfo["notificationImageUrl"],
      userInfo["imageUrl"],
      userInfo["image_url"],
      userInfo["image"]
    ]

    for candidate in candidates {
      guard let image = candidate as? String,
            let url = URL(string: image),
            url.scheme?.lowercased() == "https" else {
        continue
      }

      return url
    }

    return nil
  }

  private func imageFileExtension(for response: HTTPURLResponse, url: URL) -> String {
    switch response.mimeType?.lowercased() {
    case "image/png":
      return "png"
    case "image/gif":
      return "gif"
    case "image/heic", "image/heif":
      return "heic"
    case "image/jpeg", "image/jpg":
      return "jpg"
    default:
      let urlExtension = url.pathExtension.lowercased()
      return ["jpg", "jpeg", "png", "gif", "heic", "heif"].contains(urlExtension)
        ? (urlExtension == "jpeg" ? "jpg" : urlExtension)
        : "jpg"
    }
  }

  private func deliverBestAttempt() {
    guard let contentHandler, let bestAttemptContent else {
      return
    }

    self.contentHandler = nil
    contentHandler(bestAttemptContent)
  }
}

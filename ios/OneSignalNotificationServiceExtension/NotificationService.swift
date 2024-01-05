import UserNotifications
import Intents
import OneSignalExtension

class NotificationService: UNNotificationServiceExtension {
    
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var receivedRequest: UNNotificationRequest?
    private var bestAttemptContent: UNMutableNotificationContent?

    private func genMessageIntent(from request: UNNotificationRequest) -> INSendMessageIntent? {
        guard let custom = request.content.userInfo["custom"] as? [String: Any],
              let a = custom["a"] as? [String: Any],
              let name = a["name"] as? String,
              let urlString = a["url"] as? String,
              let url = URL(string: urlString) else {
            return nil
        }

        let handle = INPersonHandle(value: nil, type: .unknown)
        let avatar = INImage(url: url)
        let sender = INPerson(personHandle: handle, nameComponents: nil, displayName: name, image: avatar, contactIdentifier: nil, customIdentifier: nil)

      if #available(iOSApplicationExtension 14.0, *) {
        return INSendMessageIntent(
          recipients: nil,
          outgoingMessageType: .outgoingMessageText,
          content: nil,
          speakableGroupName: nil,
          conversationIdentifier: nil,
          serviceName: nil,
          sender: sender,
          attachments: nil
        )
      } else {
        // Fallback on earlier versions
        return nil
      }
    }
    
    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.receivedRequest = request
        self.contentHandler = contentHandler
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
      
      let userInfo = request.content.userInfo
      print("Payload:", userInfo)

      
      if #available(iOSApplicationExtension 15.0, *) {
        guard let intent = genMessageIntent(from: request) else {
          forwardRequestToExtension()
          return
        }
        
        let interaction = INInteraction(intent: intent, response: nil)
        interaction.direction = .incoming
        
        interaction.donate { [weak self] error in
          guard let self = self, error == nil else { return }
          
          do {
            let content = try request.content.updating(from: intent)
            self.bestAttemptContent = (content.mutableCopy() as? UNMutableNotificationContent)
            self.forwardRequestToExtension()
          } catch {
            // Handle errors appropriately
          }
        }
      } else {
        forwardRequestToExtension()
      }
    }

    private func forwardRequestToExtension() {
        guard let receivedRequest = receivedRequest, let bestAttemptContent = bestAttemptContent else { return }
        OneSignalExtension.didReceiveNotificationExtensionRequest(receivedRequest, with: bestAttemptContent, withContentHandler: contentHandler)
    }
    
    override func serviceExtensionTimeWillExpire() {
        guard let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent else { return }
        OneSignalExtension.serviceExtensionTimeWillExpireRequest(receivedRequest!, with: bestAttemptContent)
        contentHandler(bestAttemptContent)
    }
}

import Foundation
import UIKit
import PhotosUI
import SwiftUI

/// A picked media item ready to upload (compressed at pick time, like the web app).
nonisolated struct PickedMedia: Identifiable, Sendable {
    let id = UUID()
    let data: Data
    let type: String        // "image" | "video"
    let contentType: String
    let ext: String
}

nonisolated enum MediaLoader {
    /// Converts PhotosPicker selections into upload-ready media, off the main actor.
    static func load(_ items: [PhotosPickerItem]) async -> [PickedMedia] {
        var out: [PickedMedia] = []
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            if let image = UIImage(data: data), let jpeg = image.jpegData(compressionQuality: 0.6) {
                _ = image
                out.append(PickedMedia(data: jpeg, type: "image", contentType: "image/jpeg", ext: "jpg"))
            } else {
                out.append(PickedMedia(data: data, type: "video", contentType: "video/mp4", ext: "mp4"))
            }
        }
        return out
    }
}

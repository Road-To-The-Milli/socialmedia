import SwiftUI
import UIKit

/// Real camera capture via UIImagePickerController. The cloud simulator has no
/// camera, so callers must check `CameraPicker.isAvailable` and show a placeholder.
struct CameraPicker: UIViewControllerRepresentable {
    var onCapture: (PickedMedia) -> Void
    @Environment(\.dismiss) private var dismiss

    static var isAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.mediaTypes = ["public.image", "public.movie"]
        picker.videoQuality = .typeMedium
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let videoURL = info[.mediaURL] as? URL, let data = try? Data(contentsOf: videoURL) {
                parent.onCapture(PickedMedia(data: data, type: "video", contentType: "video/mp4", ext: "mp4"))
            } else if let image = info[.originalImage] as? UIImage, let jpeg = image.jpegData(compressionQuality: 0.6) {
                parent.onCapture(PickedMedia(data: jpeg, type: "image", contentType: "image/jpeg", ext: "jpg"))
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

import SwiftUI

/// Labelled field wrapper (label + optional hint/error).
struct Field<Content: View>: View {
    var label: String? = nil
    var hint: String? = nil
    var error: String? = nil
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            if let label {
                Text(label).gType(.label)
            }
            content()
            if let error {
                Text(error).font(.system(size: 12.5, weight: .semibold)).foregroundStyle(Palette.destructive)
            } else if let hint {
                Text(hint).font(.system(size: 12.5)).foregroundStyle(Palette.textFaint)
            }
        }
    }
}

/// Styled text input matching the web Input component.
struct GatherTextField: View {
    var placeholder: String
    @Binding var text: String
    var systemIcon: String?
    var secure: Bool = false
    var keyboard: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    var autocorrection: Bool = true
    var multiline: Bool = false
    var tracking: CGFloat = 0
    var submitLabel: SubmitLabel = .return
    var onSubmit: (() -> Void)?

    @FocusState private var focused: Bool
    @State private var revealed: Bool = false

    private var borderColor: Color { focused ? Palette.primary : Palette.border }

    var body: some View {
        HStack(alignment: multiline ? .top : .center, spacing: 10) {
            if let systemIcon {
                Image(systemName: systemIcon)
                    .font(.system(size: 17))
                    .foregroundStyle(Palette.textFaint)
                    .padding(.top, multiline ? 2 : 0)
            }
            Group {
                if secure && !revealed {
                    SecureField("", text: $text, prompt: promptText)
                } else if multiline {
                    TextField("", text: $text, prompt: promptText, axis: .vertical)
                        .lineLimit(4...8)
                } else {
                    TextField("", text: $text, prompt: promptText)
                }
            }
            .font(.system(size: 15.5, weight: .medium))
            .tracking(tracking)
            .foregroundStyle(Palette.text)
            .tint(Palette.primary)
            .focused($focused)
            .keyboardType(keyboard)
            .textInputAutocapitalization(autocapitalization)
            .autocorrectionDisabled(!autocorrection)
            .submitLabel(submitLabel)
            .onSubmit { onSubmit?() }

            if secure {
                Button {
                    revealed.toggle()
                } label: {
                    Image(systemName: revealed ? "eye.slash" : "eye")
                        .font(.system(size: 17))
                        .foregroundStyle(Palette.textMuted)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, multiline ? Spacing.md : 0)
        .frame(minHeight: multiline ? 110 : 50, alignment: multiline ? .top : .center)
        .background(Palette.bgElevated, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                .stroke(borderColor, lineWidth: 1.5)
        )
        .animation(.easeOut(duration: 0.15), value: focused)
    }

    private var promptText: Text {
        Text(placeholder).foregroundColor(Palette.textFaint)
    }
}

import Foundation
import Capacitor
import WebKit

class CustomWebView: WKWebView {
    override var safeAreaInsets: UIEdgeInsets {
        return UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
    }
}

@objc class CustomConfigurationHandler: NSObject, WKUIDelegate {
    @objc func webView(_ webView: WKWebView) {
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.scrollView.bounces = true
    }
}

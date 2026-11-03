internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    window?.backgroundColor = .white
    window?.makeKeyAndVisible()
    NativeSplashOverlay.show(on: window)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

enum NativeSplashOverlay {
  private static var overlayView: UIView?
  private static var progressWidthConstraint: NSLayoutConstraint?

  static func show(on window: UIWindow?) {
    guard overlayView == nil, let window else { return }
    let controller = UIStoryboard(name: "SplashScreen", bundle: nil).instantiateInitialViewController()!
    let view = controller.view!
    view.frame = window.bounds
    view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(view)
    overlayView = view

    if let track = view.viewWithTag(10) {
      track.layer.cornerRadius = 3
      track.clipsToBounds = true

      let fill = UIView()
      fill.backgroundColor = UIColor(red: 2 / 255.0, green: 101 / 255.0, blue: 62 / 255.0, alpha: 1.0)
      fill.layer.cornerRadius = 3
      fill.clipsToBounds = true
      fill.translatesAutoresizingMaskIntoConstraints = false
      track.addSubview(fill)

      let fillWidth = fill.widthAnchor.constraint(equalToConstant: 0)
      progressWidthConstraint = fillWidth

      NSLayoutConstraint.activate([
        fill.leadingAnchor.constraint(equalTo: track.leadingAnchor),
        fill.topAnchor.constraint(equalTo: track.topAnchor),
        fill.bottomAnchor.constraint(equalTo: track.bottomAnchor),
        fillWidth,
      ])

      view.layoutIfNeeded()

      let targetWidth = max(track.bounds.width * 0.85, 60.0)
      if !UIAccessibility.isReduceMotionEnabled {
        UIView.animate(withDuration: 1.2, delay: 0.05, options: [.curveEaseInOut], animations: {
          fillWidth.constant = targetWidth
          track.layoutIfNeeded()
        })
      } else {
        fillWidth.constant = targetWidth
        track.layoutIfNeeded()
      }
    }
  }

  static func hide() {
    guard let view = overlayView else { return }
    overlayView = nil

    if let track = view.viewWithTag(10), let widthConstraint = progressWidthConstraint {
      widthConstraint.constant = track.bounds.width
      UIView.animate(withDuration: 0.20, animations: {
        track.layoutIfNeeded()
      })
    }

    let duration = UIAccessibility.isReduceMotionEnabled ? 0 : 0.24
    let delay = UIAccessibility.isReduceMotionEnabled ? 0 : 0.20
    UIView.animate(withDuration: duration, delay: delay, options: [], animations: {
      view.alpha = 0
    }, completion: { _ in
      view.removeFromSuperview()
      progressWidthConstraint = nil
    })
  }
}

@objc(SplashScreen)
class SplashScreenModule: NSObject {
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc
  func hide() {
    DispatchQueue.main.async {
      NativeSplashOverlay.hide()
    }
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

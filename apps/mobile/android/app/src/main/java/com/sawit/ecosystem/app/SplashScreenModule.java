package com.sawit.ecosystem.app;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;

public class SplashScreenModule extends ReactContextBaseJavaModule {
  public SplashScreenModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "SplashScreen";
  }

  @ReactMethod
  public void hide() {
    UiThreadUtil.runOnUiThread(SplashScreenController::hide);
  }
}

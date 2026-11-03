package com.sawit.ecosystem.app;

import android.app.Application;
import android.content.res.Configuration;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeApplicationEntryPoint;
import com.facebook.react.ReactPackage;

import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ExpoReactHostFactory;

import java.util.ArrayList;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {
  @Override
  public ReactHost getReactHost() {
    List<ReactPackage> packages = new ArrayList<>(new PackageList(this).getPackages());
    packages.add(new SplashScreenPackage());

    return ExpoReactHostFactory.getDefaultReactHost(
        getApplicationContext(),
        packages,
        ".expo/.virtual-metro-entry",
        "index.android.bundle",
        null,
        null,
        BuildConfig.DEBUG,
        null);
  }

  @Override
  public void onCreate() {
    super.onCreate();
    ReactNativeApplicationEntryPoint.loadReactNative(this);
    ApplicationLifecycleDispatcher.onApplicationCreate(this);
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
  }
}

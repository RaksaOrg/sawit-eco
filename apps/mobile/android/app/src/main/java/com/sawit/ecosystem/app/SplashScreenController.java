package com.sawit.ecosystem.app;

import android.animation.ObjectAnimator;
import android.app.Activity;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.TextView;

public final class SplashScreenController {
  private static View splashView;
  private static ObjectAnimator progressAnimator;

  private SplashScreenController() {}

  public static synchronized void show(Activity activity) {
    if (splashView != null) return;
    ViewGroup root = activity.findViewById(android.R.id.content);
    splashView = LayoutInflater.from(activity).inflate(R.layout.activity_splash, root, false);
    root.addView(splashView);

    final int[] bounds = new int[2];
    splashView.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> {
      int width = r - l;
      int height = b - t;
      if (width <= 0 || height <= 0 || (width == bounds[0] && height == bounds[1])) return;
      bounds[0] = width;
      bounds[1] = height;

      View logo = v.findViewById(R.id.splash_logo);
      int logoW = Math.round(width * 170f / 666f);
      int logoH = Math.round(logoW * 897f / 956f);
      FrameLayout.LayoutParams lpLogo = new FrameLayout.LayoutParams(logoW, logoH);
      lpLogo.leftMargin = Math.round(width * 333f / 666f - logoW / 2f);
      lpLogo.topMargin = Math.round(height * 269f / 1495f);
      logo.setLayoutParams(lpLogo);

      TextView titleSawit = v.findViewById(R.id.splash_title_sawit);
      int titleW = Math.round(width * 460f / 666f);
      FrameLayout.LayoutParams lpSawit = new FrameLayout.LayoutParams(titleW, ViewGroup.LayoutParams.WRAP_CONTENT);
      lpSawit.leftMargin = Math.round(width * 333f / 666f - titleW / 2f);
      lpSawit.topMargin = Math.round(height * 439f / 1495f);
      titleSawit.setLayoutParams(lpSawit);
      titleSawit.setTextSize(TypedValue.COMPLEX_UNIT_SP, 45f);

      TextView titleEcosystem = v.findViewById(R.id.splash_title_ecosystem);
      FrameLayout.LayoutParams lpEcosystem = new FrameLayout.LayoutParams(titleW, ViewGroup.LayoutParams.WRAP_CONTENT);
      lpEcosystem.leftMargin = Math.round(width * 333f / 666f - titleW / 2f);
      lpEcosystem.topMargin = Math.round(height * 500f / 1495f);
      titleEcosystem.setLayoutParams(lpEcosystem);
      titleEcosystem.setTextSize(TypedValue.COMPLEX_UNIT_SP, 40f);

      TextView tagline = v.findViewById(R.id.splash_tagline);
      int tagW = Math.round(width * 380f / 666f);
      FrameLayout.LayoutParams lpTag = new FrameLayout.LayoutParams(tagW, ViewGroup.LayoutParams.WRAP_CONTENT);
      lpTag.leftMargin = Math.round(width * 333f / 666f - tagW / 2f);
      lpTag.topMargin = Math.round(height * 644f / 1495f);
      tagline.setLayoutParams(lpTag);
      tagline.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f);

      View progressTrack = v.findViewById(R.id.splash_progress_track);
      int progW = Math.round(width * 132f / 666f);
      int progH = Math.max(6, Math.round(height * 6f / 1495f));
      FrameLayout.LayoutParams lpProg = new FrameLayout.LayoutParams(progW, progH);
      lpProg.leftMargin = Math.round(width * 333f / 666f - progW / 2f);
      lpProg.topMargin = Math.round(height * 819f / 1495f - progH / 2f);
      progressTrack.setLayoutParams(lpProg);

      TextView footer = v.findViewById(R.id.splash_footer);
      int footW = Math.round(width * 400f / 666f);
      FrameLayout.LayoutParams lpFoot = new FrameLayout.LayoutParams(footW, ViewGroup.LayoutParams.WRAP_CONTENT);
      lpFoot.leftMargin = Math.round(width * 333f / 666f - footW / 2f);
      lpFoot.topMargin = Math.round(height * 1335f / 1495f);
      footer.setLayoutParams(lpFoot);
      footer.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14.8f);
    });

    float animScale = Settings.Global.getFloat(
      activity.getContentResolver(),
      Settings.Global.ANIMATOR_DURATION_SCALE,
      1.0f
    );
    View progressFill = splashView.findViewById(R.id.splash_progress_fill);
    progressFill.setPivotX(0f);
    progressFill.setScaleX(0f);
    if (animScale > 0.0f) {
      progressAnimator = ObjectAnimator.ofFloat(progressFill, View.SCALE_X, 0f, 0.85f);
      progressAnimator.setDuration(1200L);
      progressAnimator.setInterpolator(new AccelerateDecelerateInterpolator());
      progressAnimator.start();
    } else {
      progressFill.setScaleX(0.85f);
    }
  }

  public static synchronized void hide() {
    if (splashView == null) return;
    View view = splashView;
    splashView = null;
    if (progressAnimator != null) {
      progressAnimator.cancel();
      progressAnimator = null;
    }
    View progressFill = view.findViewById(R.id.splash_progress_fill);
    if (progressFill != null) {
      progressFill.animate().scaleX(1f).setDuration(200L).start();
    }
    view.animate().alpha(0f).setStartDelay(200L).setDuration(240L).withEndAction(() -> {
      ViewGroup parent = (ViewGroup) view.getParent();
      if (parent != null) parent.removeView(view);
    }).start();
  }
}

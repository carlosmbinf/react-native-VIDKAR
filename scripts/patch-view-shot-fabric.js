/* global __dirname */
/** Make view-shot resolve Fabric views on the main queue when RN removes Paper. */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/react-native-view-shot/ios/RNViewShot.mm');
if (!fs.existsSync(file)) process.exit(0);
let source = fs.readFileSync(file, 'utf8');
if (source.includes('VIDKAR_FABRIC_VIEW_SHOT')) process.exit(0);
const before = `  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {

    // Get view
    UIView *view;

    if ([target intValue] == -1) {
      UIWindow *window = [[UIApplication sharedApplication] keyWindow];
      view = window;
    } else {
      view = viewRegistry[target];
    }
`;
const after = `  // VIDKAR_FABRIC_VIEW_SHOT: resolve and capture atomically on the main queue.
  void (^captureBlock)(UIView *) = ^(UIView *view) {
`;
const ending = `    });
  }];
}

#ifdef RCT_NEW_ARCH_ENABLED`;
const replacement = `    });
  };
#if defined(RCT_REMOVE_LEGACY_ARCH)
  dispatch_async(dispatch_get_main_queue(), ^{
    UIView *view = nil;
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
      if (![scene isKindOfClass:[UIWindowScene class]]) continue;
      for (UIWindow *window in ((UIWindowScene *)scene).windows) {
        if ([target intValue] == -1) {
          if (window.isKeyWindow) { view = window; break; }
        } else {
          view = [window viewWithTag:target.integerValue];
          if (view) break;
        }
      }
      if (view) break;
    }
    captureBlock(view);
  });
#else
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = [target intValue] == -1 ? [[UIApplication sharedApplication] keyWindow] : viewRegistry[target];
    captureBlock(view);
  }];
#endif
}

#ifdef RCT_NEW_ARCH_ENABLED`;
if (!source.includes(before) || !source.includes(ending)) {
  throw new Error('Unsupported react-native-view-shot iOS source; review the Fabric capture patch.');
}
source = source.replace(before, after).replace(ending, replacement);
fs.writeFileSync(file, source);
console.log('[patch-view-shot-fabric] Captura Fabric habilitada en iOS.');

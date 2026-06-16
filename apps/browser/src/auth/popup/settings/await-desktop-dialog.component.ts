import { Component, ChangeDetectionStrategy } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import {
  ButtonModule,
  CenterPositionStrategy,
  DialogModule,
  DialogService,
} from "@bitwarden/components";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  templateUrl: "await-desktop-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [JslibModule, ButtonModule, DialogModule],
})
export class AwaitDesktopDialogComponent {
  static open(dialogService: DialogService) {
    return dialogService.open<boolean>(AwaitDesktopDialogComponent, {
      positionStrategy: new CenterPositionStrategy(),
    });
  }
}

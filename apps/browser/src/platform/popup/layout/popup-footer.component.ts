import { Component, ChangeDetectionStrategy } from "@angular/core";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "popup-footer",
  templateUrl: "popup-footer.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
})
export class PopupFooterComponent {}

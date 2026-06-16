import { Component, ChangeDetectionStrategy } from "@angular/core";

import { SharedModule } from "../../../shared";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "app-send-access-explainer",
  templateUrl: "send-access-explainer.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [SharedModule],
})
export class SendAccessExplainerComponent {
  constructor() {}
}

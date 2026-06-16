import { TemplatePortal, CdkPortalOutlet } from "@angular/cdk/portal";
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "vault-carousel-content",
  templateUrl: "carousel-content.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CdkPortalOutlet],
})
export class VaultCarouselContentComponent {
  /** Content to be displayed for the carousel. */
  // FIXME(https://bitwarden.atlassian.net/browse/CL-903): Migrate to Signals
  // eslint-disable-next-line @angular-eslint/prefer-signals
  @Input({ required: true }) content!: TemplatePortal;
}

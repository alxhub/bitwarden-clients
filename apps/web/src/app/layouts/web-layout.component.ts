import { CommonModule } from "@angular/common";
import { Component, ChangeDetectionStrategy } from "@angular/core";

import { LayoutComponent } from "@bitwarden/components";

import { ProductSwitcherModule } from "./product-switcher/product-switcher.module";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "app-layout",
  templateUrl: "web-layout.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, LayoutComponent, ProductSwitcherModule],
})
export class WebLayoutComponent {
  constructor() {}
}

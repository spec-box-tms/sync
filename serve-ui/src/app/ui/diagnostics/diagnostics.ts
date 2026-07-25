import { Component, computed, inject } from '@angular/core';
import { TuiDataList, TuiDropdown, TuiHint, TuiLoader, TuiNotification } from '@taiga-ui/core';
import { TuiAvatar, TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';
import { ProjectService } from '../../core/project.service';
import { Diagnostics as DiagnosticsModel } from '../../model/diagnostics.model';

@Component({
  selector: 'diagnostics',
  templateUrl: 'diagnostics.html',
  styleUrl: 'diagnostics.scss',
  imports: [
    TuiLoader,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiNotification,
    TuiAvatar,
    TuiDataList,
    TuiDropdown,
    TuiHint,
  ],
})
export class Diagnostics {
  readonly projectResource = inject(ProjectService).projectResource;
  readonly diagnostics = computed(() => {
    if (this.projectResource.hasValue()) {
      return this.projectResource.value().diagnostics;
    }
    return null;
  });

  readonly hasErrors = computed(() => {
    const diagnostics = this.diagnostics();
    if (diagnostics == null) {
      return false;
    }
    return diagnostics.length > 0;
  });

  readonly info = computed(() => this.diagnostics()?.filter((d) => d.severity === 'info') ?? []);
  readonly warnings = computed(
    () => this.diagnostics()?.filter((d) => d.severity === 'warning') ?? [],
  );
  readonly errors = computed(() => this.diagnostics()?.filter((d) => d.severity === 'error') ?? []);

  severityToAppearance(severity: DiagnosticsModel['severity']): string {
    if (severity === 'error') {
      return 'negative';
    }
    if (severity === 'warning') {
      return 'warning';
    }
    return 'info';
  }

  protected infoOpen = false;
  protected warningsOpen = false;
  protected errorsOpen = false;
}

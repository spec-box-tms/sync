import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import cytoscape, { Core } from 'cytoscape';
import { ProjectSnapshot } from '../../../model/project-snapshot.model';

type GraphLayout = 'breadthfirst' | 'circle' | 'concentric' | 'weighted';

@Component({
  selector: 'graph',
  templateUrl: 'graph.html',
  styleUrl: 'graph.scss',
})
export class Graph implements AfterViewInit, OnDestroy {
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly graphHost = viewChild.required<ElementRef<HTMLDivElement>>('graph');
  private graph?: Core;
  private selectedNodeId?: string;
  private hoveredNodeId?: string;

  readonly project = input.required<ProjectSnapshot>();
  readonly featureCode = input<string | null>(null);
  readonly layout = signal<GraphLayout>('breadthfirst');
  readonly generations = signal(2);

  ngAfterViewInit(): void {
    effect(() => this.renderGraph(), { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.graph?.destroy();
  }

  onLayoutChange(event: Event): void {
    this.layout.set((event.target as HTMLSelectElement).value as GraphLayout);
  }

  onGenerationsChange(event: Event): void {
    this.generations.set(
      Math.max(0, Math.floor(Number((event.target as HTMLInputElement).value) || 0)),
    );
  }

  private renderGraph(): void {
    const { nodes, edges } = this.project().dependencyGraph;
    const activeCode = this.featureCode();
    const visibleCodes = this.visibleCodes(activeCode, nodes, edges);
    const visibleNodes = visibleCodes ? nodes.filter((node) => visibleCodes.has(node.code)) : nodes;
    const visibleEdges = visibleCodes
      ? edges.filter((edge) => visibleCodes.has(edge.from) && visibleCodes.has(edge.to))
      : edges;
    const graphEdges = Array.from(
      new Map(visibleEdges.map((edge) => [`${edge.from}\0${edge.to}`, edge] as const)).values(),
    );
    const degree = (code: string) =>
      graphEdges.filter((edge) => edge.from === code || edge.to === code).length;
    const layout = this.layout();
    const colors = this.themeColors();

    this.graph?.destroy();
    this.graph = cytoscape({
      container: this.graphHost().nativeElement,
      elements: [
        ...visibleNodes.map((node) => ({
          data: {
            id: node.code,
            label: node.title ?? node.code,
            degree: degree(node.code),
            exists: node.exists,
          },
          classes: node.exists ? '' : 'missing',
        })),
        ...graphEdges.map((edge, index) => ({
          data: { id: `${edge.from}-${edge.to}-${index}`, source: edge.from, target: edge.to },
          classes: edge.resolved ? '' : 'unresolved',
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            shape: 'round-rectangle',
            width: 'mapData(degree, 0, 6, 128, 176)',
            height: 'mapData(degree, 0, 6, 48, 64)',
            'font-size': 'mapData(degree, 0, 6, 12, 14)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '112px',
            color: colors.text,
            'background-color': colors.node,
            'border-color': colors.border,
            'border-width': 1,
          },
        },
        {
          selector: 'node.active',
          style: {
            'background-color': colors.active,
            'border-color': colors.active,
            'border-width': 3,
            color: colors.activeText,
          },
        },
        {
          selector: 'node.missing',
          style: { 'background-color': colors.negativePale, 'border-color': colors.negative },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            opacity: 0.65,
            'line-color': colors.edge,
            'target-arrow-color': colors.edge,
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.7,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge.unresolved',
          style: {
            'line-style': 'dashed',
            'line-color': colors.negative,
            'target-arrow-color': colors.negative,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            width: 2,
            opacity: 1,
            'line-color': colors.active,
            'target-arrow-color': colors.active,
          },
        },
      ],
      layout:
        layout === 'breadthfirst'
          ? {
              name: layout,
              directed: true,
              fit: false,
              padding: 64,
              spacingFactor: 1.2,
              animate: false,
            }
          : layout === 'weighted'
            ? {
                name: 'concentric',
                concentric: (node) => Number(node.data('degree')),
                levelWidth: () => 1,
                fit: false,
                padding: 64,
                animate: false,
              }
            : { name: layout, fit: false, padding: 64, animate: false },
      minZoom: 0.3,
      maxZoom: 2.5,
    });

    if (activeCode) {
      this.graph.$id(activeCode).addClass('active');
    }
    this.bindHighlights();
    this.graph.fit(this.graph.elements(), 64);
    if (this.graph.zoom() > 1) {
      this.graph.zoom(1).center();
    }
  }

  private bindHighlights(): void {
    this.graph?.on('mouseover', 'node', (event) => {
      this.hoveredNodeId = event.target.id();
      this.updateHighlights();
    });
    this.graph?.on('mouseout', 'node', () => {
      this.hoveredNodeId = undefined;
      this.updateHighlights();
    });
    this.graph?.on('tap', 'node', (event) => {
      this.selectedNodeId = event.target.id();
      this.updateHighlights();
      if (!event.target.data('exists')) return;

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { feature: event.target.id() },
        queryParamsHandling: 'merge',
      });
    });
    this.graph?.on('tap', (event) => {
      if (event.target === this.graph) {
        this.selectedNodeId = undefined;
        this.updateHighlights();
      }
    });
  }

  private updateHighlights(): void {
    if (!this.graph) return;

    this.graph.edges().removeClass('highlighted');
    const nodeId = this.hoveredNodeId ?? this.selectedNodeId;
    if (nodeId) this.graph.$id(nodeId).connectedEdges().addClass('highlighted');
  }

  private themeColors() {
    const host = this.graphHost().nativeElement;
    const probe = document.createElement('span');
    host.append(probe);
    const color = (variable: string) => {
      probe.style.color = `var(${variable})`;
      return getComputedStyle(probe).color;
    };
    const colors = {
      node: color('--tui-background-elevation-2'),
      text: color('--tui-text-primary'),
      border: color('--tui-border-normal'),
      edge: color('--tui-border-normal-strong'),
      active: color('--tui-background-accent-2'),
      activeText: color('--tui-text-primary-on-accent-2'),
      negative: color('--tui-status-negative'),
      negativePale: color('--tui-status-negative-pale'),
    };
    probe.remove();
    return colors;
  }

  private visibleCodes(
    activeCode: string | null,
    nodes: ProjectSnapshot['dependencyGraph']['nodes'],
    edges: ProjectSnapshot['dependencyGraph']['edges'],
  ): Set<string> | null {
    if (!activeCode || this.generations() === 0 || !nodes.some((node) => node.code === activeCode)) {
      return null;
    }

    const visible = new Set([activeCode]);
    let frontier = new Set([activeCode]);

    for (let generation = 0; generation < this.generations(); generation++) {
      const next = new Set<string>();
      for (const edge of edges) {
        if (frontier.has(edge.from) && !visible.has(edge.to)) next.add(edge.to);
        if (frontier.has(edge.to) && !visible.has(edge.from)) next.add(edge.from);
      }
      next.forEach((code) => visible.add(code));
      frontier = next;
    }

    return visible;
  }
}

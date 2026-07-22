import { MarkdownService } from '../markdown.service';
import { BlockquoteComponent } from './blockquote/blockquote.component';
import { CodeComponent } from './code/code.component';
import { HeadingComponent } from './heading/heading.component';
import { HrComponent } from './hr/hr.component';
import { ImageComponent } from './image/image.component';
import { InlineCodeComponent } from './inline-code/inline-code.component';
import { InternalLinkComponent } from './internal-link/internal-link.component';
import { LinkComponent } from './link/link.component';
import { ListItemComponent } from './list-item/list-item.component';
import { MermaidService } from './mermaid/mermaid.service';
import { ParagraphComponent } from './paragraph/paragraph.component';
import { PrismService } from './prism/prism.service';
import { TableComponent } from './table/table.component';
import { TextComponent } from './text/text.component';
import { ListComponent } from './list/list.component';
import { ItalicComponent } from './text/italic.component';
import { DelComponent } from './text/del.component';
import { StrongComponent } from './text/strong.component';
import { TOKEN_RENDERERS } from './for-token.directive';

export function provideMarkdown() {
  return [
    {
      provide: TOKEN_RENDERERS,
      useValue: {
        heading: HeadingComponent,
        paragraph: ParagraphComponent,
        blockquote: BlockquoteComponent,
        table: TableComponent,
        code: CodeComponent,
        list: ListComponent,
        list_item: ListItemComponent,
        hr: HrComponent,
        image: ImageComponent,
        link: LinkComponent,

        codespan: InlineCodeComponent,
        text: TextComponent,
        escape: TextComponent,

        strong: StrongComponent,
        em: ItalicComponent,
        del: DelComponent,
        internalLink: InternalLinkComponent,
      },
    },
    MarkdownService,
    PrismService,
    MermaidService,
  ];
}

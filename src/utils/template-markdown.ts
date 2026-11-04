import type { CodeTemplate, TemplateExportOptions } from '../../shared/types';

export function templateToMarkdown(template: CodeTemplate, options: TemplateExportOptions): string {
  const metadata: string[] = [];
  if (options.includeLanguage) {
    metadata.push(`Language: ${template.language}`);
  }
  if (options.includeCategory && template.category) {
    metadata.push(`Category: ${template.category}`);
  }
  const heading = options.includeTitle ? `## ${template.title}\n\n` : '';
  const meta = metadata.length > 0 ? `${metadata.join(' · ')}\n\n` : '';
  const language = template.language === 'other' ? 'text' : template.language;
  return `${heading}${meta}\`\`\`${language}\n${template.content}\n\`\`\`\n`;
}

export function templatesToMarkdown(
  templates: CodeTemplate[],
  options: TemplateExportOptions,
): string {
  if (templates.length === 0) return '# OJFlow Templates\n\nNo templates available.\n';
  const byCategory = new Map<string, CodeTemplate[]>();
  for (const template of templates) {
    const category = options.includeCategory && template.category ? template.category : 'General';
    const list = byCategory.get(category) ?? [];
    list.push(template);
    byCategory.set(category, list);
  }
  const sections = [...byCategory.entries()].map(([category, list]) => {
    const heading = options.includeCategory ? `### ${category}\n\n` : '';
    return `${heading}${list.map(template => templateToMarkdown(template, options)).join('\n')}`;
  });
  return `# OJFlow Templates\n\n${sections.join('\n')}`;
}

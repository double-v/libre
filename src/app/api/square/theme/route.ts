import { NextResponse } from 'next/server';
import { getTodayThemeConfig } from '@/lib/square/themes-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getTodayThemeConfig();
  return NextResponse.json({
    themeId: config.themeId,
    label: config.label,
    description: config.description,
    inputType: config.inputType,
    placeholder: config.placeholder,
    maxLength: config.maxLength,
    allowFreeText: config.allowFreeText,
    options: config.options,
    pseudonymNames: config.pseudonymNames,
  });
}
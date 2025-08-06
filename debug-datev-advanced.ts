#!/usr/bin/env ts-node

/**
 * Advanced DATEV API Route Analyzer
 * Analysiert TypeScript/JavaScript Code für DATEV API Calls
 */

import * as fs from 'fs';
import * as path from 'path';

interface SearchResult {
  file: string;
  line: number;
  column: number;
  content: string;
  context: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
}

class DatevApiAnalyzer {
  private results: SearchResult[] = [];
  private readonly projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  // Patterns for different types of API calls
  private patterns = [
    {
      regex: /fetch\s*\(\s*[\'"`]([^\'"`]*datev\/organization[^\'"`]*)[\'"`]/gi,
      type: 'FETCH_CALL',
      severity: 'HIGH' as const,
    },
    {
      regex: /POST[\s\S]*?datev\/organization/gi,
      type: 'POST_REQUEST',
      severity: 'HIGH' as const,
    },
    {
      regex: /method:\s*[\'"`]POST[\'"`][\s\S]*?datev.*organization/gi,
      type: 'POST_METHOD',
      severity: 'HIGH' as const,
    },
    {
      regex: /[\'"`]\/api\/datev\/organization[\'"`]/g,
      type: 'API_STRING',
      severity: 'MEDIUM' as const,
    },
    {
      regex: /new\s+URL\s*\([^)]*datev\/organization/gi,
      type: 'URL_CONSTRUCTOR',
      severity: 'MEDIUM' as const,
    },
    {
      regex: /axios\.(post|put|patch)\s*\([^)]*datev.*organization/gi,
      type: 'AXIOS_CALL',
      severity: 'HIGH' as const,
    },
  ];

  private searchInFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.projectRoot, filePath);

      this.patterns.forEach(({ regex, type, severity }) => {
        let match;
        const globalRegex = new RegExp(regex.source, regex.flags);

        while ((match = globalRegex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const column = match.index - content.lastIndexOf('\n', match.index - 1);
          const line = lines[lineNumber - 1];

          // Skip false positives
          if (this.shouldSkip(line, relativePath)) {
            continue;
          }

          // Get context (3 lines before and after)
          const context: string[] = [];
          for (
            let i = Math.max(0, lineNumber - 4);
            i < Math.min(lines.length, lineNumber + 3);
            i++
          ) {
            const prefix = i === lineNumber - 1 ? '>>> ' : '    ';
            context.push(`${prefix}${i + 1}: ${lines[i]}`);
          }

          this.results.push({
            file: relativePath,
            line: lineNumber,
            column,
            content: line.trim(),
            context,
            severity,
            type,
          });
        }
      });
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  private shouldSkip(line: string, filePath: string): boolean {
    return (
      line.includes('organizations') || // Skip plural forms
      line.includes('//') || // Skip single-line comments
      line.includes('/*') || // Skip multi-line comments
      line.includes('console.log') || // Skip debug logs
      line.includes('organizations,') || // Skip import/export lists
      filePath.includes('/debug-') || // Skip debug files
      filePath.includes('.spec.') || // Skip test files
      filePath.includes('.test.') // Skip test files
    );
  }

  private searchDirectory(dir: string): void {
    const fullPath = path.join(this.projectRoot, dir);

    if (!fs.existsSync(fullPath)) {
      return;
    }

    const walkDir = (currentPath: string) => {
      const items = fs.readdirSync(currentPath);

      items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Skip certain directories
          if (!item.startsWith('.') && !['node_modules', 'dist', 'build', '.next'].includes(item)) {
            walkDir(itemPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
            this.searchInFile(itemPath);
          }
        }
      });
    };

    walkDir(fullPath);
  }

  public analyze(): SearchResult[] {
    console.log('🔍 Analyzing DATEV API routes...');

    const searchDirs = [
      'src/app',
      'src/components',
      'src/lib',
      'src/services',
      'src/hooks',
      'src/contexts',
      'firebase_functions/src',
    ];

    searchDirs.forEach(dir => {
      this.searchDirectory(dir);
    });

    return this.results;
  }

  public printResults(): void {
    const high = this.results.filter(r => r.severity === 'HIGH');
    const medium = this.results.filter(r => r.severity === 'MEDIUM');
    const low = this.results.filter(r => r.severity === 'LOW');

    console.log(`\n📊 ANALYSIS RESULTS:`);
    console.log(`Total matches found: ${this.results.length}`);
    console.log(`🚨 High severity: ${high.length}`);
    console.log(`⚠️ Medium severity: ${medium.length}`);
    console.log(`ℹ️ Low severity: ${low.length}\n`);

    if (high.length > 0) {
      console.log(`🚨 CRITICAL ISSUES:`);
      high.forEach(result => {
        console.log(`\n❌ ${result.file}:${result.line}:${result.column}`);
        console.log(`   Type: ${result.type}`);
        console.log(`   Context:`);
        result.context.forEach(line => console.log(`   ${line}`));
      });
    }

    if (medium.length > 0) {
      console.log(`\n⚠️ SUSPICIOUS PATTERNS:`);
      medium.forEach(result => {
        console.log(`\n⚠️ ${result.file}:${result.line} - ${result.type}`);
        console.log(`   ${result.content}`);
      });
    }

    if (this.results.length === 0) {
      console.log(`✅ No suspicious DATEV organization API calls found!`);
      console.log(`💡 The 404 error might be caused by:`);
      console.log(`   - Browser cache`);
      console.log(`   - Next.js cache (.next directory)`);
      console.log(`   - Service worker cache`);
      console.log(`   - External tools/extensions making requests`);
    }
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new DatevApiAnalyzer();
  analyzer.analyze();
  analyzer.printResults();
}

export default DatevApiAnalyzer;

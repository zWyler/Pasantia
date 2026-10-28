import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

function themeTokens(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1] || '';
    return Object.fromEntries(
        [...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)]
            .map((match) => [match[1], match[2]]),
    );
}

function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((value) => (
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

test('theme tokens keep interface text and semantic labels above WCAG AA contrast', () => {
    for (const selector of [':root', ':root[data-theme="dark"]']) {
        const tokens = themeTokens(selector);
        for (const token of [
            '--text', '--text-muted', '--accent-text', '--danger-text',
            '--success-text', '--warning-text', '--info-text',
        ]) {
            assert.ok(
                contrast(tokens[token], tokens['--surface']) >= 4.5,
                `${selector} ${token} must contrast with the surface`,
            );
        }
        assert.ok(contrast('#ffffff', tokens['--accent']) >= 4.5, `${selector} button text must remain readable`);
    }
});

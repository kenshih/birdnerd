import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  viteFinal: async viteConfig => ({
    ...viteConfig,
    // Storybook shares Field's Vite config for React and aliases, but it is
    // neither a PWA nor a deployable app. Its manager bundle must not be
    // included in Field's production service-worker precache.
    plugins: withoutFieldPwaPlugins(viteConfig.plugins),
  }),
}

export default config

function isFieldPwaPlugin(plugin: unknown): boolean {
  return typeof plugin === 'object'
    && plugin !== null
    && 'name' in plugin
    && typeof plugin.name === 'string'
    && plugin.name.startsWith('vite-plugin-pwa')
}

function withoutFieldPwaPlugins(plugins: PluginOption[] | undefined): PluginOption[] | undefined {
  return plugins?.flatMap(plugin => {
    if (Array.isArray(plugin)) return withoutFieldPwaPlugins(plugin) ?? []
    return isFieldPwaPlugin(plugin) ? [] : [plugin]
  })
}

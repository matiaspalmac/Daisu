import type { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import nextI18NextConfig from '../next-i18next.config'

const MyApp = ({ Component, pageProps }: AppProps) => (
  <Component {...pageProps} />
)
   
// https://github.com/i18next/next-i18next#unserializable-configs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (appWithTranslation as any)(MyApp, nextI18NextConfig)
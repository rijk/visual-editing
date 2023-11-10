import { client } from './sanity.client'
import { serverOnly } from './sanity.loader'

const token = process.env.SANITY_API_READ_TOKEN

if (!token) {
  throw new Error('Missing SANITY_API_READ_TOKEN')
}

const { query, setServerClient } = serverOnly
setServerClient(
  client.withConfig({
    token,
    // Enable stega if it's a Vercel preview deployment, as the Vercel Toolbar has controls that shows overlays
    stega: {
      ...client.config().stega,
      enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview',
    },
  }),
)

// Exports to be used by getInitialProps, getServerSideProps, getStaticProps
export { query }

<script lang="ts">
  import { useQuery } from '@sanity/svelte-loader'
  import { PortableText } from '@portabletext/svelte'
  import { shoe as shoeQuery, type ShoeResult } from 'apps-common/queries'
  import { formatCurrency } from 'apps-common/utils'
  import { urlFor, urlForCrossDatasetReference } from '$lib/sanity'
  import type { PageData } from './$types'

  export let data: PageData
  const { initial, params } = data

  const query = useQuery<ShoeResult>(shoeQuery, params, { initial })

  $: ({ data: product, loading, encodeDataAttribute } = $query)

  $: [coverImage, ...otherImages] = product?.media || []
</script>

<svelte:head>
  <title>{product.title}</title>
</svelte:head>

<div class="min-h-screen bg-white">
  <nav aria-label="Breadcrumb" class="pt-16 sm:pt-24">
    <ol
      class="mx-auto flex max-w-2xl items-center space-x-2 px-4 sm:px-6 lg:max-w-7xl lg:px-8"
    >
      <li>
        <div class="flex items-center">
          <a href="/shoes" class="mr-2 text-sm font-medium text-gray-900">
            Shoes
          </a>
          <svg
            width={16}
            height={20}
            viewBox="0 0 16 20"
            fill="currentColor"
            aria-hidden="true"
            class="h-5 w-4 text-gray-300"
          >
            <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
          </svg>
        </div>
      </li>
      <li class="text-sm" style={'textWrap: balance'}>
        <a
          href={`/shoes/${params.slug}`}
          aria-current="page"
          class="font-medium text-gray-500 hover:text-gray-600"
        >
          {loading ? 'Loading' : product?.title || 'Untitled'}
        </a>
      </li>
    </ol>
  </nav>

  {#if product}
    <article>
      {#if coverImage?.asset}
        <div
          data-sanity={encodeDataAttribute('media[0].asset')}
          class="mx-auto max-w-2xl px-4 pt-16 sm:px-6 lg:max-w-7xl lg:px-8 lg:pt-24"
        >
          <img
            class="aspect-video w-full rounded-md object-cover object-center group-hover:opacity-75 lg:rounded-lg"
            src={urlFor(coverImage)
              .width(1280 * 2)
              .height(720 * 2)
              .url()}
            width={1280}
            height={720}
            alt={coverImage.alt || ''}
          />
        </div>
      {/if}
      {#if otherImages?.length > 0}
        <div
          class="mx-auto max-w-2xl px-4 pt-5 sm:px-6 lg:max-w-7xl lg:px-8 lg:pt-8"
        >
          <div
            class="relative flex w-full snap-x snap-mandatory gap-6 overflow-x-auto"
          >
            {#each otherImages as image, i (image.asset?._ref || i + 1)}
              {#if image.asset?._ref}
                <div
                  data-sanity={encodeDataAttribute(['media', i + 1, 'asset'])}
                  class="shrink-0 snap-start"
                >
                  <img
                    class="h-32 w-40 shrink-0 rounded bg-white shadow-xl lg:rounded-lg"
                    src={urlFor(image)
                      .width(1280 / 2)
                      .height(720 / 2)
                      .url()}
                    width={1280 / 2}
                    height={720 / 2}
                    alt={image.alt || ''}
                  />
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      <!-- Product info -->
      <div
        class="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-3 lg:grid-rows-[auto,auto,1fr] lg:gap-x-8 lg:px-8 lg:pb-24 lg:pt-16"
      >
        <div class="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
          <h1
            class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
            style={'textWrap: balance'}
          >
            {product.title}
          </h1>
        </div>

        <!-- Options -->
        <div class="mt-4 flex flex-col gap-y-6 lg:row-span-3 lg:mt-0">
          <h2 class="sr-only">Product information</h2>
          <p class="text-3xl tracking-tight text-gray-900">
            {product.price ? formatCurrency(product.price) : 'FREE'}
          </p>

          {#if product.brand?.name}
            <div>
              <h2 class="text-sm font-medium text-gray-900">Brand</h2>
              <div class="flex items-center gap-x-2">
                <img
                  class="h-10 w-10 rounded-full bg-gray-50"
                  src={product.brand?.logo?.asset
                    ? urlForCrossDatasetReference(product.brand.logo)
                        .width(48)
                        .height(48)
                        .url()
                    : `https://source.unsplash.com/featured/48x48?${encodeURIComponent(
                        product.brand.name,
                      )}`}
                  width={24}
                  height={24}
                  alt={product.brand?.logo?.alt || ''}
                />
                <span class="text-lg font-bold">
                  {product.brand.name}
                </span>
              </div>
            </div>
          {/if}

          <form class="mt-3">
            <button
              type="button"
              class="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add to bag
            </button>
          </form>
        </div>

        <div
          class="py-10 lg:col-span-2 lg:col-start-1 lg:border-r lg:border-gray-200 lg:pb-16 lg:pr-8 lg:pt-6"
        >
          <!-- Description and details -->
          <div>
            <h3 class="sr-only">Description</h3>

            <div class="space-y-6 text-base text-gray-900">
              {#if product.description}
                <PortableText components={{}} value={product.description} />
              {:else}
                'No description'
              {/if}
            </div>
          </div>
        </div>
      </div>
    </article>
  {/if}
</div>

<script>
  import srpc from '$lib/utilities/srpc.js'
  import error from '$lib/utilities/error.js'
  import { LS } from '$lib/S.svelte'
  import { goto } from '$app/navigation'
  let { data } = $props()
  let tokenInput = $state(''), loading = $state(false)
  async function init (token) {
    loading = true
    const res = await srpc.grapher.auth(token)
    tokenInput = ''
    if (await error(res)) return loading = false
    LS.grapherToken = token
    LS.grapherPath = LS.grapherPath || res.dataPrefix
    goto('../grapher')
  }
  if (data?.token) init(data.token)
</script>

<div class="h-screen w-screen flex flex-col items-center justify-center select-none bg-gray-100">
  <img src="./favicon.svg" alt="logo" class="w-56">
  <h1 class="text-4xl font-bold my-4">LabWeb Grapher</h1>
  {#if loading}
    <div class="font-mono animate-pulse">Loading...</div>
  {:else}
    <input class="px-4 py-2 rounded border bg-white w-80 sm:w-1/2 font-mono text-center select-all" placeholder="Enter Grapher Token" bind:value={tokenInput} onkeyup={e => { if (e.key === 'Enter') init(tokenInput) }} />
  {/if}
</div>

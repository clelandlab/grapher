<script>
	import srpc from '$lib/utilities/srpc.js'
  import error from '$lib/utilities/error.js'
  import { LS, token } from '$lib/S.svelte'
  import swal from 'sweetalert2'
  import { parse } from 'ini'
  import YAML from 'yaml'
  import { AIcon } from 'ace.svelte'
  import { mdiDatabase, mdiFolderOutline, mdiOpenInNew, mdiStar, mdiDelete, mdiArrowLeft, mdiArrowCollapseDown, mdiArrowCollapseUp, mdiRefreshAuto, mdiChartAreaspline, mdiFolderPlusOutline } from '@mdi/js'
  import Graph from '$lib/components/Graph.svelte'
  import { debounce } from '$lib/utilities/utils.js'
  import { goto } from '$app/navigation'

  let { data } = $props()
  let path = $state(data.path || LS.dataPrefix), list = $state([]), tag = $state({}), focus = $state(''), filter = $state('')
  let listEl = $state(null), filterList = $state([])
  let refresh = $state(true), keyword = $state('')

  async function loadPath () {
    path = path.replaceAll('\\', '/')
    if (path[path.length - 1] !== '/') path += '/'
    LS.dataPrefix = path
    const res = await srpc.grapher.getList(token(), path)
    if (await error(res)) return refresh = false
    list = res.res.sort((a, b) => {
      const isDirA = a.match(/\.dir$/), isDirB = b.match(/\.dir$/)
      if (isDirA && !isDirB) return -1
      if (!isDirA && isDirB) return 1
      return a.substring(0, a.length - 4) < b.substring(0, b.length - 4) ? -1 : 1
    })
    tag = {}
    const ini = parse(res.ini || '')
    if (ini?.Tags?.datasets) tag = JSON.parse(ini.Tags.datasets.replaceAll(`{'trash'}`, `'trash'`).replaceAll(`{'star'}`, `'star'`).replaceAll(`set()`, `''`).replaceAll(`'`, `"`))
    const yml = YAML.parse(res.yml || '')
    if (yml?.tag) tag = yml.tag
  }
  if (!token()) goto('/')
  else {
    if (data.path || LS.dataPrefix) loadPath()
    setInterval(() => {
      if (refresh && path) loadPath()
    }, 2e3)
  }

  function updateFilterList () {
    const kw = keyword.toLowerCase()
    filterList = list.filter(l => {
      const dn = displayName(l)
      if (keyword && !dn.toLowerCase().includes(kw)) return false
      if (l.match(/\.dir$/)) return true
      if (!filter && tag[dn] !== 'trash') return true
      if (tag[dn] === filter) return true
      return false
    })
  }
  const debouncedUpdateFilterList = debounce(updateFilterList, 200)
  $effect(() => { filter; keyword; tag; list; debouncedUpdateFilterList() })

  const displayName = l => l.substring(0, l.length - 4).replaceAll('%v', '|').replaceAll('%g', '>').replaceAll('%l', '<').replaceAll('%c', ':').replaceAll('%f', '/')

  function click (l, e) {
    if (e.detail > 1 || l.match(/\.dir$/)) return
    focus = path + l.substring(0, l.length - 4)
  }

  function dblclick (l, e) {
    if (!l.match(/\.dir$/)) return
    path = path + l + '/'
    loadPath()
  }

  function back () {
    path = path.replace(/(?:(?!\/).)*?\.dir\/$/, '')
    loadPath()
  }

  async function createDir () {
    const { value } = await swal.fire({
      title: 'Create New Directory',
      icon: 'question',
      input: 'text',
      inputPlaceholder: 'Enter directory name',
      showCancelButton: true,
      confirmButtonText: 'Create',
      cancelButtonText: 'Cancel'
    })
    if (!value.match(/^[^\/\\\.]+$/)) return
    const res = await srpc.grapher.createDir(token(), path, value)
    if (await error(res)) return refresh = false
  }

  function open (l, e) {
    e.stopPropagation()
    if (e.detail > 1 || l.match(/\.dir$/)) return
    const newPath = path + l.substring(0, l.length - 4)
    window.open('/graph/?path=' + encodeURIComponent(newPath), l, 'popup,width=600,height=500,left=10,top=10')
  }

  async function addTag (l, t, e) {
    e.stopPropagation()
    if (e.detail > 1 || l.match(/\.dir$/)) return
    if (tag[displayName(l)] === t) delete tag[displayName(l)]
    else tag[displayName(l)] = t
    const res = await srpc.grapher.writeYML(token(), path, YAML.stringify({ tag }))
    if (await error(res)) return refresh = false
  }

  window.addEventListener('keyup', e => {
    if (!focus || typeof e.srcElement.value !== 'undefined' || e.srcElement.contentEditable === 'true') return
    e.preventDefault()
    const l = focus.replace(path, '') + '.ini'
    if (e.key === 's') return addTag(l, 'star', e)
    if (e.key === 't') return addTag(l, 'trash', e)
  })

  function scroll (bottom) {
    if (!listEl) return
    if (bottom) listEl.scrollTop = listEl.scrollHeight
    else listEl.scrollTop = 0
  }
</script>

<div class="h-screen w-full bg-gray-100 flex flex-col" style="min-width: 1024px;">
  <div class="flex items-center px-4 py-2">
    <AIcon path={mdiChartAreaspline} size="2rem" class="mr-2" />
    <h1 class="font-bold text-2xl mr-4">Grapher</h1>
    <input class="outline-none bg-white block font-mono p-1 px-3 text-sm grow" bind:value={path} placeholder="Enter Data Directory Path" onkeyup={e => { if (e.key === 'Enter') loadPath() }} />
  </div>
  <div class="flex grow h-0">
    <div class="flex flex-col items-start pb-2 px-4 w-1/2 xl:w-2/5 h-full select-none">
      <div class="flex items-center justify-between w-full text-gray-700 bg-gray-200 py-2 rounded-t-md">
        <button class="px-1 cursor-pointer flex items-center text-left text-sm" ondblclick={back}>
          <AIcon size="1.2rem" style="min-width: 1.2rem;" path={mdiArrowLeft} />
          <b>..</b>
        </button>
        <div class="px-2 text-sm flex items-center">
          <button class="px-1 cursor-pointer" onclick={createDir} title="create directory">
            <AIcon size="1.2rem" path={mdiFolderPlusOutline} />
          </button>
          <button class="px-1 cursor-pointer" onclick={() => refresh = !refresh} title="list auto refresh">
            <AIcon size="1.2rem" class={refresh ? "text-blue-500" : "text-gray-700"} path={mdiRefreshAuto} />
          </button>
          <button class="px-1 cursor-pointer" onclick={() => scroll(false)} title="scroll to top">
            <AIcon size="1.2rem" path={mdiArrowCollapseUp} />
          </button>
          <button class="px-1 cursor-pointer" onclick={() => scroll(true)} title="scroll to bottom">
            <AIcon size="1.2rem" path={mdiArrowCollapseDown} />
          </button>
          <b class="ml-2">Filter: </b>
          <AIcon path={mdiStar} size="1.1rem" class="cursor-pointer ml-1 text-yellow-500 {filter === 'star' ? 'opacity-100' : 'opacity-30 hover:opacity-50'}" onclick={e => filter = filter === 'star' ? '' : 'star'}></AIcon>
          <AIcon path={mdiDelete} size="1.1rem" class="cursor-pointer ml-1 text-red-500 {filter === 'trash' ? 'opacity-100' : 'opacity-30 hover:opacity-50'}" onclick={e => filter = filter === 'trash' ? '' : 'trash'}></AIcon>
          <input class="block ml-1 w-32 font-bold {keyword ? 'bg-white' : 'bg-gray-200 focus:bg-gray-100'} rounded outline-none px-1" placeholder="keyword" bind:value={keyword} />
        </div>
      </div>
      <div class="flex grow h-0 flex-col items-start overflow-auto w-full" bind:this={listEl}>
        {#each filterList as l}
          {@const dp = displayName(l)}
          <button class={'px-1 cursor-pointer flex items-center text-black text-left text-sm w-full ' + (focus === path + l.substring(0, l.length - 4) ? 'bg-blue-200' : 'bg-gray-100')} onclick={e => click(l, e)} ondblclick={() => dblclick(l)}>
            <AIcon path={l.match(/\.dir$/) ? mdiFolderOutline : mdiOpenInNew} size="1.1rem" style="min-width: 1.1rem;" onclick={e => open(l, e)}></AIcon>
            <b class="whitespace-nowrap mx-1" style="min-width: 80px;">{dp}</b>
            {#if l.match(/\.csv$/)}
              <AIcon path={mdiStar} size="1.1rem" class="text-yellow-500 {tag[dp] === 'star' ? 'opacity-100' : 'opacity-10 hover:opacity-30'}" onclick={e => addTag(l, 'star', e)}></AIcon>
              <AIcon path={mdiDelete} size="1.1rem" class="text-red-500 {tag[dp] === 'trash' ? 'opacity-100' : 'opacity-10 hover:opacity-30'}" onclick={e => addTag(l, 'trash', e)}></AIcon>
            {/if}
          </button>
        {/each}
      </div>
    </div>
    <div class="w-1/2 xl:w-3/5 h-full overflow-y-auto">
      <Graph path={focus}></Graph>
    </div>
  </div>
</div>

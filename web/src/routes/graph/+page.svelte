<script>
  import Graph from '$lib/components/Graph.svelte'
  let { data } = $props()
</script>

<Graph path={data.path}></Graph>

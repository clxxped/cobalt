<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import { contacts, docs } from "$lib/env";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="information">
<SectionHeading
    title="instance information"
    sectionId="information"
/>

this instance is hosted by [clxxped](https://clxxped.lol)

currently the frontend works similarly to default cobalt in that it will cycle instances for each request. if a request doesn't work it's good to try and do it multiple times so that you can get a working instance
</section>

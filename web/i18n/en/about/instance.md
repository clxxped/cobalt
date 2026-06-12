<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import { contacts, docs } from "$lib/env";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="information">
<SectionHeading
    title="clxxped.lol cobalt instance"
    sectionId="information"
/>

this instance is hosted by [clxxped](https://clxxped.lol)

currently the frontend works similarly to default cobalt in that it will cycle instances for each request. if a request doesn't work it's good to try and do it multiple times so that you can get a working instance
</section>

<section id="playlist">
<SectionHeading
    title="playlist downloading"
    sectionId="playlist"
/>

this feature is not supported by other official instances of cobalt and therefore can only be utilised by instances running the clxxped/cobalt or br0k3x/cobalt forks

for playlist downloading to work as intended it is also recommended to specify a single one of these instances

supported instances can be found on [cobalt.directory](https://cobalt.directory), an instance directory run by [hyperdefined](https://hyper.lol/)/[canine.tools](https://canine.tools)
</section>

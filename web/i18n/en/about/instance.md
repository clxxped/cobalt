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

this instance is hosted by [clxxped](https://clxxped.lol).

the public repository can be found [here](https://github.com/clxxped/cobalt)

currently the frontend works similarly to default cobalt in that it will cycle instances for each request. if a request doesn't work it's good to try and do it multiple times so that you can get a working instance.
</section>

<section id="playlist">
<SectionHeading
    title="playlist downloading"
    sectionId="playlist"
/>

this feature is not supported by other official instances of cobalt and therefore can only be utilised by instances running the clxxped/cobalt or br0k3x/cobalt forks.

for playlist downloading to work as intended it is also recommended to specify a single one of these instances.

supported instances can be found on [cobalt.directory](https://cobalt.directory), an instance directory run by [hyperdefined](https://hyper.lol/)/[canine.tools](https://canine.tools).
</section>

<section id="logging">
<SectionHeading
    title = "logging"
    sectionId ="logging"
/>

all traffic to my instances is logged and can be checked by me, the information logged only includes request headers and response codes/headers. I can't see any information sent to instances other than turnstile headers, api keys or content_length headers. (Please note also that I can see all public ips used to send requests to my instances, I can assure you that they will not be used in any harmful way other than detecting misuse of these services).
</section>

<section id="api">
<SectionHeading
    title = "api access"
    sectionId ="api"
/>

all instances associated with this frontend use turnstile, if you would like access please contact me via discord or email (depending if it works) and I will most likely give you a key. I don't enforce much strict rules with keys but I will sometimes monitor usage of my keys. (Also please note I have a base rate limit of 10 requests/minute for all newly made keys)
</section>

<section id="credits">
<SectionHeading
    title = "credits"
    sectionId ="credits"
/>
[br0k3x](https://github.com/br0k3x) Playlist 
Code

[zImPatrick](https://github.com/zImPatrick) Most of the fixes for youtube and other services
  
[hyperdefined](https://hyper.lol) help/guides for hosting with warp
</section>

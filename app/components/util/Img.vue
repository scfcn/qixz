<script setup lang="ts">
import ImageComponent from '#build/mdc-image-component.mjs'
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo'

const props = withDefaults(defineProps<{
	src: string
	width?: string | number
	height?: string | number
	alt?: string
	mirror?: ImgService
}>(), {
	alt: '',
})

const FALLBACK_IMG = 'https://s3.qixz.cn/ywty/2026/06/20/6a366d2bcda01.webp'
const FALLBACK_TIMEOUT = 1200

const refinedSrc = ref(props.src)
const referrerPolicy = ref<'no-referrer' | undefined>(undefined)
let fallbackTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
	let src = props.src
	if (src.startsWith('/') && !src.startsWith('//')) {
		const _base = withLeadingSlash(withTrailingSlash(useRuntimeConfig().app.baseURL))
		if (_base !== '/' && !src.startsWith(_base))
			src = joinURL(_base, src)
	}
	if (props.mirror)
		src = getImgUrl(src, props.mirror)
	refinedSrc.value = src
	referrerPolicy.value = props.mirror ? 'no-referrer' : undefined
	startFallbackTimer()
})

onBeforeUnmount(() => {
	clearFallbackTimer()
})

function clearFallbackTimer() {
	if (fallbackTimer) {
		clearTimeout(fallbackTimer)
		fallbackTimer = undefined
	}
}

function startFallbackTimer() {
	clearFallbackTimer()
	if (refinedSrc.value === FALLBACK_IMG)
		return
	fallbackTimer = setTimeout(useFallbackImg, FALLBACK_TIMEOUT)
}

function useFallbackImg() {
	clearFallbackTimer()
	if (refinedSrc.value !== FALLBACK_IMG)
		refinedSrc.value = FALLBACK_IMG
}
</script>

<template>
<component
	:is="ImageComponent"
	:src="refinedSrc"
	:alt="alt"
	:width="width"
	:height="height"
	:referrerpolicy="referrerPolicy"
	@load="clearFallbackTimer"
	@error="useFallbackImg"
/>
</template>

interface BackgroundTaskOptions {
	delay?: number
	timeout?: number
}

type Cleanup = () => void

export function useBackgroundTask() {
	const cleanups: Cleanup[] = []

	const register = (cleanup: Cleanup) => {
		cleanups.push(cleanup)
		return () => {
			cleanup()
			const index = cleanups.indexOf(cleanup)
			if (index !== -1)
				cleanups.splice(index, 1)
		}
	}

	const runWhenIdle = (task: () => void | Promise<void>, options: BackgroundTaskOptions = {}) => {
		if (import.meta.server)
			return () => {}

		let cancelled = false
		let timer: ReturnType<typeof setTimeout> | undefined
		let idleId: number | undefined

		const run = () => {
			if (cancelled)
				return
			void task()
		}

		const schedule = () => {
			if ('requestIdleCallback' in window) {
				idleId = window.requestIdleCallback(run, { timeout: options.timeout ?? 3000 })
			}
			else {
				timer = setTimeout(run, options.timeout ?? 1200)
			}
		}

		if (options.delay) {
			timer = setTimeout(schedule, options.delay)
		}
		else {
			schedule()
		}

		return register(() => {
			cancelled = true
			if (timer)
				clearTimeout(timer)
			if (idleId !== undefined && 'cancelIdleCallback' in window)
				window.cancelIdleCallback(idleId)
		})
	}

	const runWhenVisible = (target: MaybeRefOrGetter<Element | null | undefined>, task: () => void | Promise<void>, options: BackgroundTaskOptions = {}) => {
		if (import.meta.server)
			return () => {}

		let cleanupIdle: Cleanup | undefined
		let observer: IntersectionObserver | undefined
		let done = false

		const run = () => {
			if (done)
				return
			done = true
			observer?.disconnect()
			cleanupIdle?.()
			void task()
		}

		const stopWatch = watch(
			() => toValue(target),
			(element) => {
				if (!element || done)
					return
				if ('IntersectionObserver' in window) {
					observer = new IntersectionObserver((entries) => {
						if (entries.some(entry => entry.isIntersecting))
							run()
					}, { rootMargin: '160px' })
					observer.observe(element)
				}
				else {
					run()
				}
			},
			{ immediate: true, flush: 'post' },
		)

		cleanupIdle = runWhenIdle(run, { delay: options.delay ?? 1500, timeout: options.timeout ?? 5000 })

		return register(() => {
			done = true
			stopWatch()
			observer?.disconnect()
			cleanupIdle?.()
		})
	}

	onScopeDispose(() => {
		for (const cleanup of cleanups.splice(0))
			cleanup()
	})

	return {
		runWhenIdle,
		runWhenVisible,
	}
}

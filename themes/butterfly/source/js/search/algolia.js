window.addEventListener('load', () => {
  // 检查必要的DOM元素是否存在
  const $searchMask = document.getElementById('search-mask')
  const $searchDialog = document.querySelector('#algolia-search .search-dialog')
  
  if (!$searchMask || !$searchDialog) {
    console.error('Search elements not found')
    return
  }

  const openSearch = () => {
    const bodyStyle = document.body.style
    bodyStyle.width = '100%'
    bodyStyle.overflow = 'hidden'
    btf.animateIn($searchMask, 'to_show 0.5s')
    btf.animateIn($searchDialog, 'titleScale 0.5s')
    
    // 修复：添加错误处理，防止元素不存在时报错
    setTimeout(() => { 
      const searchInput = document.querySelector('#algolia-search .ais-SearchBox-input')
      if (searchInput) searchInput.focus() 
    }, 100)

    // shortcut: ESC - 修复：使用更通用的key属性，兼容性更好
    document.addEventListener('keydown', function f (event) {
      if (event.key === 'Escape' || event.code === 'Escape') {
        closeSearch()
        document.removeEventListener('keydown', f)
      }
    })

    fixSafariHeight()
    window.addEventListener('resize', fixSafariHeight)
  }

  const closeSearch = () => {
    const bodyStyle = document.body.style
    bodyStyle.width = ''
    bodyStyle.overflow = ''
    btf.animateOut($searchDialog, 'search_close .5s')
    btf.animateOut($searchMask, 'to_hide 0.5s')
    window.removeEventListener('resize', fixSafariHeight)
  }

  // 修复Safari高度问题：所有设备都应用，不仅限于移动设备
  const fixSafariHeight = () => {
    if (!$searchDialog) return
    const height = window.innerHeight
    $searchDialog.style.setProperty('--search-height', `${height}px`)
  }

  const searchClickFn = () => {
    // 修复：添加错误处理，防止元素不存在
    const searchBtn = document.querySelector('#search-button > .search')
    if (searchBtn) {
      btf.addEventListenerPjax(searchBtn, 'click', openSearch)
    }
  }

  const searchFnOnce = () => {
    // 修复：添加错误处理
    if (!$searchMask) return
    $searchMask.addEventListener('click', closeSearch)
    
    const closeBtn = document.querySelector('#algolia-search .search-close-button')
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSearch)
    }
  }

  // 修复内容截取函数的潜在问题
  const cutContent = content => {
    if (!content || typeof content !== 'string') return ''

    const firstOccur = content.indexOf('<mark>')
    // 修复：当没有高亮标记时的处理
    if (firstOccur === -1) {
      return content.length > 140 ? content.substring(0, 140) + '...' : content
    }

    // 使用Math.max和Math.min防止越界
    let start = Math.max(0, firstOccur - 30)
    let end = Math.min(content.length, firstOccur + 120)
    
    const pre = start > 0 ? '...' : ''
    const post = end < content.length ? '...' : ''
    
    return pre + content.substring(start, end) + post
  }

  // 修复：添加完整的配置检查
  const algolia = GLOBAL_CONFIG.algolia
  if (!algolia || !algolia.appId || !algolia.apiKey || !algolia.indexName) {
    console.error('Algolia configuration is invalid or missing!')
    return
  }

  // 尝试初始化搜索
  try {
    const search = instantsearch({
      indexName: algolia.indexName,
      /* global algoliasearch */
      searchClient: algoliasearch(algolia.appId, algolia.apiKey),
      searchFunction (helper) {
        // 修复：只在有查询时执行搜索
        if (helper.state.query) {
          helper.search()
        }
      }
    })

    const configure = instantsearch.widgets.configure({
      hitsPerPage: 5
    })

    const searchBox = instantsearch.widgets.searchBox({
      container: '#algolia-search-input',
      showReset: false,
      showSubmit: false,
      placeholder: algolia.languages?.input_placeholder || 'Search...',
      showLoadingIndicator: true
    })

    const hits = instantsearch.widgets.hits({
      container: '#algolia-hits',
      templates: {
        item (data) {
          // 修复：添加路径检查，防止undefined
          const link = data.permalink ? data.permalink : (GLOBAL_CONFIG.root || '/') + (data.path || '')
          const result = data._highlightResult || {}
          const content = result.contentStripTruncate
            ? cutContent(result.contentStripTruncate.value)
            : result.contentStrip
              ? cutContent(result.contentStrip.value)
              : result.content
                ? cutContent(result.content.value)
                : ''
          // 修复：添加标题检查
          const title = result.title && result.title.value ? result.title.value : 'no-title'
          
          return `
            <a href="${link}" class="algolia-hit-item-link">
            <span class="algolia-hits-item-title">${title}</span>
            <p class="algolia-hit-item-content">${content}</p>
            </a>`
        },
        empty: function (data) {
          // 修复：添加languages检查
          const emptyText = algolia.languages?.hits_empty?.replace(/\$\{query}/, data.query) || 'No results for "${data.query}"'
          return `<div id="algolia-hits-empty">${emptyText}</div>`
        }
      }
    })

    const stats = instantsearch.widgets.stats({
      container: '#algolia-info > .algolia-stats',
      templates: {
        text: function (data) {
          // 修复：添加languages检查
          const statsText = algolia.languages?.hits_stats
            ?.replace(/\$\{hits}/, data.nbHits)
            ?.replace(/\$\{time}/, data.processingTimeMS) || 
            `${data.nbHits} results found in ${data.processingTimeMS}ms`
          return `<hr>${statsText}`
        }
      }
    })

    const powerBy = instantsearch.widgets.poweredBy({
      container: '#algolia-info > .algolia-poweredBy'
    })

    const pagination = instantsearch.widgets.pagination({
      container: '#algolia-pagination',
      totalPages: 5,
      templates: {
        first: '<i class="fas fa-angle-double-left"></i>',
        last: '<i class="fas fa-angle-double-right"></i>',
        previous: '<i class="fas fa-angle-left"></i>',
        next: '<i class="fas fa-angle-right"></i>'
      }
    })

    search.addWidgets([configure, searchBox, hits, stats, powerBy, pagination])

    search.start()

    searchClickFn()
    searchFnOnce()

    // 修复：pjax完成后的处理
    window.addEventListener('pjax:complete', () => {
      // 检查btf是否存在
      if (typeof btf !== 'undefined' && typeof btf.isHidden === 'function') {
        !btf.isHidden($searchMask) && closeSearch()
      } else {
        // 降级处理
        if ($searchMask && $searchMask.style.display !== 'none') {
          closeSearch()
        }
      }
      searchClickFn()
    })

    // 修复：添加错误处理
    if (window.pjax) {
      search.on('render', () => {
        const hitsElement = document.getElementById('algolia-hits')
        if (hitsElement && window.pjax && window.pjax.refresh) {
          window.pjax.refresh(hitsElement)
        }
      })
    }

    // 修复：添加内存清理
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('resize', fixSafariHeight)
      if (typeof search.dispose === 'function') {
        search.dispose()
      }
    })
  } catch (error) {
    console.error('Failed to initialize Algolia search:', error)
  }
})

var richTextEditor = {
    props: {
        value: {
          type: String,
          default: '',
        },
        deleteicon: {
            type: Boolean,
            default: false
        },
        placeholder: {
            type: String,
            default: 'Enter value'
        },
        iserror: {
            type: Boolean,
            default: false
        },
        errorclass: {
            type: String,
            default: ''
        },
        showvalidation: {
            type: Boolean,
            default: false
        },
        showcloseicon: {
            type: Boolean,
            default: false
        },
        editoronly:{
            type:Boolean,
            default: false
        },
        disableeditor: {
            type: Boolean,
            default: false
        },
        required: {
            type: Boolean,
            default: true
        },
        validationcolor: {
            type: String,
            default: 'errorColor'
        },
        classlist: {
            type: String,
            default: 'fontSize-12'
        }

    },
    data: function () {
        return {
            instanceId: window.activeRichBox ? ++window.activeRichBox : window.activeRichBox = 1,
            selectedStyles: [],
            isResizing: false,
            isFocused: false,
            text: '',
            displayrichtextonly: false,
            setFocusInterval: '',
            colorPalette: false
        }
    },
    methods: {
        onInput(element, ignoreValidation) {
            let value = element?.innerText.trim() ? element?.innerHTML.replace(/&nbsp;/g,' ')?.replace(/"/g, "'") : "";
            if (ignoreValidation) {
                value = element.innerHTML;
            }
            value = this.text = value.trim();
            this.$emit('input', value);
            eventBus.$emit('resetRichTextValidation');
        },
        bindEvents: function () {
            var handle = this.$el.querySelector('#resize_panel');
            document.addEventListener("mousemove", (e) => {
                if (!this.isResizing) {
                    return;
                }
                handle.style.height = e.clientY - handle.getBoundingClientRect().y + "px";
            }, false);
            document.addEventListener("mouseup", (e) => {
                this.isResizing = false;
                const outSideClick = !document.getElementById(`richTextEditor${this.instanceId}`)?.contains(e.target);
                this.switchDisplayContent(!this.editoronly && outSideClick);
                if (outSideClick) {
                    this.$emit('showmodel', false);
                }
            }, false);
        },
        launchRichText: function () {
            let richTextEditor = this.$el.querySelector('#resize_panel');
            let resize_panel = this.$el.querySelector('#richTextEditor-text');
            if(richTextEditor?.offsetHeight){
                resize_panel.style.height = richTextEditor.offsetHeight + 'px';
            }
        },
        placeholderOnclick: function () {
            let resize_panel = this.$el.querySelector('#richTextEditor-text');
            if (resize_panel) {
                resize_panel.focus();
            }
        },
        activateResize: function () {
            this.isResizing = true;
        },
        registerFocus: function (eve, value) {
            // if (this.$refs.editable) {// related workitem for this change is not found. Need to check here if any issue reported.
            //     this.$refs.editable.innerHTML = this.value;
            // }
            this.isFocused = value;
            if (this.setFocusInterval) {
                clearInterval(this.setFocusInterval);
            }
            if (this.isFocused) {
                this.setFocusInterval = setInterval(this.extractStyle, 100);
            } else {
                this.$emit('focusout');
            }
        },
        removeContent: function () {
            let richTextEditorField = this.$el.querySelector('#richTextEditor-text');
            richTextEditorField.innerHTML = this.text = '';
            this.$emit('input', '');
        },
        switchDisplayContent: function (value) {
            if (value) { this.$emit('showmodel', false); }
            this.displayrichtextonly = value;
            const self = this;
            if (!value) {
                Vue.nextTick(() => {
                    if (self.$refs.editable && !self.$refs.editable.innerHTML) {
                        self.$refs.editable.innerHTML = self.text;
                    }
                });
            } else if (self.$refs.editable && ![...self.$refs.editable.getElementsByTagName("*"), self.$refs.editable].some(el => el.innerText)) {
                this.removeContent();
            }
        },
        extractStyle: function () {
            let self = this;
            setTimeout(() => {
                let range = window.getSelection().getRangeAt(0);
                let richTextEditor = this.$el.querySelector(`#richTextEditor-text`);
                if (range && richTextEditor.childNodes.length) {
                    Array.from(richTextEditor.childNodes).forEach((node) => {
                        if (range.intersectsNode(node)) {
                            self.selectedStyles = self.getStyleFromNode(node, range);
                        }
                    });
                }
            }, 0);
        },
        getStyleFromNode: function (node, range) {
            let styles = [];
            switch (node.tagName) {
                case 'LI':
                    if (node.parentElement.tagName == 'UL') {
                        styles.push('insertUnorderedList');
                    } else if (node.parentElement.tagName == 'OL') {
                        styles.push('insertOrderedList');
                    }
                    break;
                case 'UL':
                    styles.push('insertUnorderedList');
                    Array.from(node.childNodes).forEach((node) => {
                        if (range.intersectsNode(node) && node.tagName === 'UL') {
                            styles.push('insertSubList');
                        }
                    });
                    break;
                case 'OL':
                    styles.push('insertOrderedList');
                    Array.from(node.childNodes).forEach((node) => {
                        if (range.intersectsNode(node) && node.tagName === 'OL') {
                            styles.push('insertSubList');
                        }
                    });
                    break;
                case 'B':
                    styles.push('bold');
                    break;
                case 'I':
                    styles.push('italic');
                    break;
            }
            return styles;
        },
        getNeighbourSibling: function (type, nxtSibling, parent) {
            let siblingData = {
                'position': 'beforeend',
                'parentDom': document.createElement(type),
            };
            if (nxtSibling?.tagName?.toLowerCase() == type) {
                siblingData.position = 'afterbegin';
                siblingData.parentDom = nxtSibling;
                if (nxtSibling?.previousElementSibling?.tagName?.toLowerCase() == type) {
                    siblingData['previousSibling'] = nxtSibling.previousElementSibling.innerHTML;
                    nxtSibling.previousElementSibling.remove();
                }
            } else if (nxtSibling?.previousElementSibling?.tagName?.toLowerCase() == type) {
                siblingData.parentDom = nxtSibling.previousElementSibling;
            } else if (!nxtSibling && parent.lastElementChild?.tagName?.toLowerCase() == type) {
                siblingData.parentDom = parent.lastElementChild;
            }
            return siblingData;
        },
        implementStyle: function (selectedNodeList, parent, style, nextElementSibling) {
            let siblingData = {};
            let index = this.selectedStyles.findIndex((el) => el == style);
            if (index != -1) {
                this.selectedStyles.splice(index, 1);
            } else {
                this.selectedStyles = [style];
                switch (style) {
                    case 'insertOrderedList':
                        siblingData = this.getNeighbourSibling('ol', nextElementSibling, parent);
                        break;
                    case 'insertUnorderedList':
                        siblingData = this.getNeighbourSibling('ul', nextElementSibling, parent);
                        break;
                    case 'bold':
                        siblingData = this.getNeighbourSibling('b', nextElementSibling, parent);
                        break;
                    case 'italic':
                        siblingData = this.getNeighbourSibling('i', nextElementSibling, parent);
                        break;
                }
            }
            Array.from(selectedNodeList).forEach((node) => {
                const innertext = node.innerText || node.data || "";
                if (index == -1 && Object.keys(siblingData).length) {
                    let domType = ['insertUnorderedList', 'insertOrderedList'].includes(style) ? 'li' : 'div';
                    let outerHtml = `${siblingData['previousSibling'] || ''}<${domType}>${innertext}</${domType}>`;
                    siblingData['parentDom'].insertAdjacentHTML(siblingData['position'], outerHtml);
                } else if (index != -1 && innertext) {
                    let outerHtml = `<div>${innertext}</div>`;
                    const appendPosition = nextElementSibling ? 'beforebegin' : 'beforeend';
                    (nextElementSibling || parent).insertAdjacentHTML(appendPosition, outerHtml);
                }
            });
            let selectedNode = siblingData['parentDom'] || (nextElementSibling ? nextElementSibling.previousElementSibling : parent.lastElementChild);
            if (siblingData['parentDom']?.outerHTML && !parent.contains(siblingData['parentDom'])) {
                const appendPosition = (nextElementSibling) ? 'beforebegin' : 'beforeend';
                (nextElementSibling || parent).insertAdjacentHTML(appendPosition, siblingData['parentDom'].outerHTML);
                selectedNode = nextElementSibling ? nextElementSibling.previousElementSibling : parent.lastElementChild;
            }
            this.onInput(parent, true);
            
            setTimeout(() => {
                parent.focus();
                const selection = window.getSelection();
                const range = document.createRange();
                if (selectedNode) {
                    selectedNode = [...parent.childNodes].find((node) => (node.tagName == selectedNode.tagName && node.innerHTML == selectedNode.innerHTML));
                    if (selectedNode.childElementCount && selectedNodeList.length) {
                        selectedNode = [...selectedNode.childNodes].find((node) => node.innerHTML == selectedNodeList[selectedNodeList.length - 1].innerHTML);
                    }
                }
                if (selectedNode) {
                    range.selectNodeContents(selectedNode);
                } else if (parent.lastElementChild.childElementCount) {
                    range.selectNodeContents(parent.lastElementChild.lastChild);
                } else {
                    range.selectNodeContents(parent.lastChild);
                }
                range.collapse();
                selection.removeAllRanges();
                selection.addRange(range);
            }, 0);
        },
        differentiateTabStyling: function (event, action = 'insert') { // action = 'insert' or 'remove'
            let richTextEditorField = this.$el.querySelector('#richTextEditor-text');
            let selectedRange = window.getSelection()?.getRangeAt(0);
            let selectedNodeList = [];
            if (richTextEditorField.getElementsByTagName('li').length) {
                Array.from(richTextEditorField.getElementsByTagName('li')).forEach((node) => {
                    if (selectedRange.intersectsNode(node)) {
                        selectedNodeList.push(node);
                    }
                });
            }
            if (selectedNodeList.length) {
                event.preventDefault();
                this.toggleSubBullets(selectedNodeList, richTextEditorField, action);
            }
        },
        toggleSubBullets: function (selectedNodeList, parent, action) {
            const parentElem = selectedNodeList[0].parentNode;
            if (action === 'insert') {
                if (['ul', 'ol'].includes(selectedNodeList[0].previousSibling?.tagName.toLowerCase())) {
                    for (let i=0; i<selectedNodeList.length; i++) {
                        selectedNodeList[0].previousSibling.appendChild(selectedNodeList[i]);
                    }
                } else if (['ul', 'ol'].includes(selectedNodeList[selectedNodeList.length - 1].nextSibling?.tagName.toLowerCase())) {
                    for (let i=0; i<selectedNodeList.length; i++) {
                        selectedNodeList[selectedNodeList.length - 1].nextSibling.insertBefore(selectedNodeList[i], selectedNodeList[selectedNodeList.length - 1].nextSibling.firstChild);
                    }
                } else {
                    let element = 'ul';
                    if (this.selectedStyles.includes('insertOrderedList')) {
                        element = 'ol';
                    }
                    const wrapper = document.createElement(element);
                    parentElem.replaceChild(wrapper, selectedNodeList[0]);
                    for (let i=0; i<selectedNodeList.length; i++) {
                        wrapper.appendChild(selectedNodeList[i]);
                    }
                }
                this.onInput(parent, true);
            } else {
                // remove sub bullets here
                if (!selectedNodeList[0].previousSibling) { // first element in sub list
                    const mainParent = parentElem.previousSibling ? (parentElem.previousSibling.closest('ul') || parentElem.previousSibling.closest('ol')) : (parentElem.closest('ul') || parentElem.closest('ol'));
                    for (let i=0; i<selectedNodeList.length; i++) {
                        mainParent.insertBefore(selectedNodeList[i], parentElem);
                    }
                } else if (!selectedNodeList[selectedNodeList.length - 1].nextSibling) { // last element in sub list
                    const mainParent = parentElem.nextSibling ? (parentElem.nextSibling.closest('ul') || parentElem.nextSibling.closest('ol')) : (parentElem.closest('ul') || parentElem.closest('ol'));
                    for (let i=selectedNodeList.length - 1; i >= 0; i--) {
                        mainParent.insertBefore(selectedNodeList[i], parentElem.nextSibling);
                    }
                } else {
                    // middle split
                    const siblings = this.getSiblings(selectedNodeList[0], false);
                    const tagName = parentElem.tagName.toLowerCase();
                    const afterWrapper = document.createElement(tagName);
                    for (let i=0; i<siblings.after.length; i++) {
                        afterWrapper.appendChild(siblings.after[i]);
                    }
                    parentElem.replaceWith(afterWrapper);
                    let mainParent = {};
                    if (afterWrapper.nextSibling) {
                        mainParent = afterWrapper.nextSibling.closest('ul') || afterWrapper.nextSibling.closest('ol');
                    } else if(afterWrapper.previousSibling) {
                        mainParent = afterWrapper.previousSibling.closest('ul') || afterWrapper.previousSibling.closest('ol');
                    }
                    mainParent.insertBefore(selectedNodeList[0], afterWrapper);
                    const beforeWrapper = document.createElement(tagName);
                    for (let i=0; i<siblings.before.length; i++) {
                        beforeWrapper.appendChild(siblings.before[i]);
                    }
                    mainParent.insertBefore(beforeWrapper, afterWrapper.previousSibling);
                }
                if (!parentElem.hasChildNodes()) {
                    parentElem.remove();
                }
            }
        },
        getSiblings : function(elm, withTextNodes) {
            if( !elm || !elm.parentNode ) return
            
            let siblings = [...elm.parentNode[withTextNodes ? 'childNodes' : 'children']],
                idx = siblings.indexOf(elm);
            
            siblings.before = siblings.slice(0, idx)
            siblings.after = siblings.slice(idx + 1)
            
            return siblings
        },
        differentiateStyling: function (style) {
            var richTextEditorField = this.$el.querySelector('#richTextEditor-text');
            let selectedRange = window.getSelection()?.getRangeAt(0);
            let selectedNodeList = [];
            let nextElementSibling = '';
            if (richTextEditorField.childNodes.length) {
                const childsNotSelected = [...richTextEditorField.childNodes].some((node) => selectedRange.intersectsNode(node));
                Array.from(richTextEditorField.childNodes).forEach((node) => {
                    if (selectedRange.intersectsNode(node) || !childsNotSelected) {
                        nextElementSibling = node.nextElementSibling;
                        switch (node.tagName?.toLowerCase()) {
                            case 'br':
                                node.remove();
                                break;
                            case 'b':
                            case 'i':
                            case 'ol':
                            case 'ul':
                                selectedNodeList = [...selectedNodeList, ...node.querySelectorAll('div'), ...node.querySelectorAll('li')];
                                node.remove();
                                break;
                            case 'div':
                            case 'li':
                                selectedNodeList.push(node);
                                node.remove();
                                break;
                            default:
                                let content = document.createElement('div');
                                content.innerText = node.innerText || node.data || '';
                                selectedNodeList.push(content);
                                node.remove();
                        }
                    }
                });
            } else {
                selectedNodeList = [document.createElement('div')];
            }

            if (selectedNodeList.length) {
                this.implementStyle(selectedNodeList, richTextEditorField, style, nextElementSibling);
            }
        },
        handleClipboard: function (e) {
            var bufferText = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text/html');
            const dom = new DOMParser();
            if (bufferText == "" || bufferText.indexOf('xmlns:') != -1) {
                bufferText = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text');
                if (/\r|\n/.exec(bufferText)) {
                    const domElement = dom.parseFromString(bufferText.split(/(?:\r\n|\r|\n)/g).map((elm) => `<p>${elm}</p>`).join(''), 'text/html');
                    bufferText = domElement.body.innerHTML;
                }
            } else {
                bufferText = bufferText.replace(/(<\/?(?:p|ul|ol|li)[^>]*>)|<[^>]+>/ig, '$1');
                let domFromCopy = dom.parseFromString(bufferText, 'text/html');
                [...domFromCopy.body.querySelectorAll('*')]?.forEach((node) => {
                    node.removeAttribute?.('style');
                });
                bufferText = domFromCopy.body.innerHTML;
            }
            e.preventDefault();
            document.execCommand('insertHtml', false, bufferText);
        },
        removeColor: function() {
            let range = window.getSelection().getRangeAt(0),
            mark = document.createElement('span');
            const rangeParentElement = range.endContainer.parentElement;
            this.RemoveHighlightandColor("colorChange",rangeParentElement, mark, range);
        },
        RemoveHighlightandColor: function (type = "",rangeParentElement, span, range) {
            let childElement = "";
            const mainParent = rangeParentElement ? rangeParentElement.parentElement : null;
            if(type == "highlight") {
                childElement = rangeParentElement.innerHTML.replaceAll(`<span class="highlight">`,'');;
            } else if (rangeParentElement.tagName == 'DIV' && mainParent.tagName == 'SPAN'){
                const removeColorElement = mainParent.innerHTML.replaceAll(`<span class="redColor">`,'');
                childElement = removeColorElement.replaceAll(`<span class="blueColor">`,'');
                mainParent.className = "";
            }else if(rangeParentElement.tagName == 'SPAN'){
                const removeColorElement = rangeParentElement.innerHTML.replaceAll(`<span class="redColor">`,'');
                childElement = removeColorElement.replaceAll(`<span class="blueColor">`,'');
            }
            if(childElement) {
                rangeParentElement.remove();
                if(mainParent.classList.contains("richTextEditor-text")) {
                    span.appendChild(range.extractContents());
                    span.innerHTML = childElement;
                    range.insertNode(span);
                    const richEle = this.$el.querySelector('#richTextEditor-text');
                    const richEleString = richEle.innerHTML;
                    const removeSpan = richEleString.replaceAll("<span>","");
                    richEle.innerHTML = removeSpan;
                } else {
                    mainParent.innerHTML = childElement;
                }
                const richEle = this.$el.querySelector('#richTextEditor-text');
                const richEleString = richEle.innerHTML;
                const removeSpan = richEleString.replaceAll(`<span class="">`,"");
                richEle.innerHTML = removeSpan;
            }
        },
        hightlightText: function(event) {
            let range = window.getSelection().getRangeAt(0),
            mark = document.createElement('span');
            const rangeParentElement = range.startContainer.parentElement;
            if(rangeParentElement.className == "highlight"){
                this.RemoveHighlightandColor("highlight",rangeParentElement, mark, range);
                return;
            }
            mark.appendChild(range.extractContents());
            const spanRemoverHighlight = mark.innerHTML.replaceAll(`<span class="highlight">`,'');
            mark.className = "highlight";
            const  markEle = spanRemoverHighlight.replaceAll("<div>",`<div><span class="highlight">`);
            mark.innerHTML = markEle.replaceAll("</div>","</div></span>");
            range.insertNode(mark);
        },
        changeColor: function(event,colorClass) {
            this.colorPalette = false;
            let range = window.getSelection().getRangeAt(0),
            mark = document.createElement('span');
            mark.className = colorClass;
            mark.appendChild(range.extractContents());
            const spanRemoverHighlight = mark.innerHTML.replaceAll(`class="${colorClass}"`,'');
            mark.innerHTML = spanRemoverHighlight;
            range.insertNode(mark);
        },
    },
    created() { },
    mounted() {
        if (this.value) {
            if (this.$refs && this.$refs.editable) {
                this.$refs.editable.innerHTML = this.value;
            }
            this.text = this.value;
        }
        this.bindEvents();
        this.launchRichText();
    },
    beforeDestroy() {
        this.onInput(this.$el.querySelector('#richTextEditor-text'));
    },
    watch: {
        'value'() {
            if (this.$refs.editable && this.text != this.value) {
                this.$refs.editable.innerHTML = this.text = unescape(this.value);
            }
        }
    },
    filters: {},
    computed: {},
}

let popoutActive = false;

const createPopout = ({
    buttons = [],
    overlayCompleteHook = () => {},
    completeHook = () => {},
    navigateEvent = () => {},
    closeOnNavigate = false,
    addEventListeners = true,
    updatePosition = false,
    noReturn = false,
    offsetPx = 80,
}={}) => {
    console.log(`closeOnNavigate: ${closeOnNavigate}`);

    let closeable = true;

    let closeableUpdate = () => {};

    const setCloseable = (value) => {
        console.log(`setCloseable: ${value}`);
        if(closeable != value) {
            closeable = value;
            closeableUpdate(closeable);

            document.querySelectorAll(`#popoutOverlayDiv`).forEach(e => {
                anime.remove(e);
                anime({
                    targets: e,
                    backgroundColor: `rgba(0,0,0,${closeable ? 0.6 : 1})`,
                    duration: 900,
                    easing: `easeOutExpo`
                });
            });
        }
    }

    const applyStyle = (element) => {
        element.style.position = `fixed`;
        element.style.top = `0px`;
        element.style.width = `100vw`;
        element.style.height = `100vh`;
        element.style.backgroundColor = `rgba(0,0,0,0)`;
    };

    let closeWindow = () => new Promise(r => r());

    let frame = null;

    let parsedButtons = [];

    let divs = {};

    for(const o of buttons.filter(o => o.element)) {
        const name = o.heading || o.element.id || `(unnamed)`;
        const button = o.element;
        const href = o.href || o.element.href;

        if(button.id) button.id += `-popout`;
        button.style.zIndex = `9999999999`;

        console.log(`Setting button "${name}" as popout to href "${href}"`);

        button.removeAttribute(`href`);

        const click = () => {
            console.log(`button ${name} clicked; popoutActive: ${popoutActive}`);

            if(document.getElementById(`navigationBar`) && document.getElementById(`navigationBar`).style[`-webkit-app-region`] != `no-drag`) {
                document.getElementById(`navigationBar`).style[`-webkit-app-region`] = `no-drag`;
            }

            const currentNotification = document.body.querySelector(`.notificationBox`);
        
            const overlayDiv = document.createElement(`div`);

            divs[`overlayDiv`] = overlayDiv;
        
            applyStyle(overlayDiv);

            overlayDiv.id = `popoutOverlayDiv`;
        
            const overlayCloseText = document.createElement(`h6`);
            
            overlayCloseText.style.pointerEvents = `none`;
            overlayCloseText.style.position = `fixed`;
            overlayCloseText.style.bottom = `${offsetPx/2.5}px`;
            overlayCloseText.style.width = `100vw`;
            overlayCloseText.style.textAlign = `center`;
            overlayCloseText.style.opacity = 0;

            overlayCloseText.classList.add(`ez-text`);
            
            overlayCloseText.innerText = `Click anywhere to close.`;

            if(!popoutActive) {
                closeWindow();

                popoutActive = true;

                const buttonBounds = button.getBoundingClientRect();

                const clone = popout(button, false, { anchorRight: true, addToBody: false }, { margin: true, padding: true, });

                clone.style.opacity = 1

                const { right, top } = clone.style

                console.log(`loading "${href}"`);

                const h = document.createElement(`iframe`);
                h.style.zIndex = `9999999999`;

                frame = h;

                h.src = href;
                //h.sandbox = `allow-scripts allow-same-origin`;

                let ready = false;

                let secondaryAnimation = () => {
                    if(ready) {
                        anime({
                            targets: h,
                            opacity: 1,
                            scale: [0.5, 1],
                            duration: 700,
                            easing: `easeOutExpo`,
                            complete: () => {
                                overlayCompleteHook();

                                overlayDiv.onmouseenter = async () => {
                                    console.log(`mouseenter`);
                
                                    let entered = Math.max(Date.now() + 90);
                
                                    const animate = (closeable) => {
                                        if(pendingCloses.length) {
                                            closeWindow();
                                        } else {
                                            anime.remove(overlayDiv);
                                            anime.remove(overlayCloseText);
                                            anime.remove(h);

                                            const delay = Math.max(0, (entered - Date.now()));
            
                                            console.log(`closeable update: ${closeable} -- delay: ${delay}`)
                
                                            if(closeable) {
                                                anime({
                                                    targets: overlayDiv,
                                                    backgroundColor: `rgba(0,0,0,0.6)`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                
                                                overlayCloseText.innerText = `Click anywhere to close.`;
                    
                                                anime({
                                                    targets: overlayCloseText,
                                                    opacity: 0.75,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                    
                                                anime({
                                                    targets: h,
                                                    scale: 0.75,
                                                    opacity: 0.9,
                                                    top: `${offsetPx/2}px`,
                                                    right: `${offsetPx/2}px`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                                            } else {
                                                anime({
                                                    targets: overlayDiv,
                                                    backgroundColor: `rgba(0,0,0,1)`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                
                                                overlayCloseText.innerText = `Cannot close now.`;
                    
                                                anime({
                                                    targets: overlayCloseText,
                                                    opacity: 1,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                    
                                                anime({
                                                    targets: h,
                                                    scale: 0.8,
                                                    opacity: 0.9,
                                                    top: `${offsetPx/2}px`,
                                                    right: `${offsetPx/2}px`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                                            }
                                        }
                                    }
                
                                    closeableUpdate = (val) => animate(val);
                
                                    animate(closeable);
                                };
                
                                overlayDiv.onmouseleave = () => {
                                    console.log(`mouseleave`);
                
                                    const animate = (closeable) => {
                                        anime.remove(overlayDiv);
                                        anime.remove(overlayCloseText);
                                        anime.remove(h);
                                        
                                        anime({
                                            targets: overlayDiv,
                                            backgroundColor: `rgba(0,0,0,${closeable ? 0.6 : 1})`,
                                            duration: 500,
                                            easing: `easeOutExpo`
                                        });
                                    }
                
                                    closeableUpdate = (val) => animate(val);
                
                                    animate(closeable);
                
                                    anime({
                                        targets: overlayCloseText,
                                        opacity: 0,
                                        duration: 500,
                                        easing: `easeOutExpo`
                                    });
                
                                    anime({
                                        targets: h,
                                        scale: 1,
                                        opacity: 1,
                                        top: `${offsetPx/2}px`,
                                        right: `${offsetPx/2}px`,
                                        duration: 500,
                                        easing: `easeOutExpo`
                                    });
                                };
                
                                let pendingCloses = [];
                
                                closeWindow = (force) => new Promise(res => {
                                    if(typeof force != `boolean`) force = false;
                
                                    console.log(`closeWindow: ${closeable || force} (closeable: ${closeable}) (force: ${force})`)
                
                                    if(closeable || force) {
                                        popoutActive = false;
                                        frame = null;

                                        if(document.getElementById(`navigationBar`) && document.getElementById(`navigationBar`).style[`-webkit-app-region`] != `drag`) {
                                            document.getElementById(`navigationBar`).style[`-webkit-app-region`] = `drag`;
                                        }

                                        overlayDiv.style.pointerEvents = `none`;
                
                                        closeWindow = () => new Promise(r => r());
                
                                        closeableUpdate = () => {};
                
                                        anime.remove(overlayDiv);
                                        anime.remove(overlayCloseText);
                                        anime.remove(h);
                
                                        overlayDiv.id += `-removed`;
                
                                        overlayDiv.onmouseenter = null;
                                        overlayDiv.onmouseleave = null;
                
                                        anime({
                                            targets: overlayDiv,
                                            backgroundColor: `rgba(0,0,0,0)`,
                                            duration: 500,
                                            easing: `easeOutExpo`,
                                            complete: () => overlayDiv.remove()
                                        });
                
                                        anime({
                                            targets: overlayCloseText,
                                            opacity: 0,
                                            duration: 500,
                                            easing: `easeOutExpo`
                                        });
                
                                        anime.remove(h);

                                        const hOpt = {
                                            targets: h,
                                            scale: 0.35,
                                            opacity: 0,
                                            duration: 350,
                                            easing: `easeOutExpo`,
                                            complete: () => h.remove()
                                        }

                                        if(!noReturn) Object.assign(hOpt, {
                                            left: `${offsetPx}px`,
                                            top: `${offsetPx*-1}px`,
                                        })

                                        anime(hOpt);
                        
                                        const { x, y } = button.getBoundingClientRect();
                
                                        const newRight = (updatePosition && x ? `${x}px` : null) || right;
                                        const newTop = (updatePosition && y ? `${y}px` : null) || top;

                                        const newOpacity = noReturn ? 0 : (button.parentElement ? 1 : 0)
                
                                        console.log(`newRight: ${newRight} (from ${right}) -- newTop: ${newTop} (from ${top}); newOpacity: ${newOpacity}`)
                
                                        anime.remove(clone);
                                        anime({
                                            targets: clone,
                                            opacity: newOpacity,
                                            scale: 1,
                                            right: newRight,
                                            top: newTop,
                                            duration: 650,
                                            easing: `easeOutExpo`,
                                            complete: () => {
                                                clone.remove();
                                                button.style.opacity = 1;
                                                pendingCloses.push(res);
                                                pendingCloses.forEach(r => r());
                                            }
                                        });
                
                                        completeHook();
                                    } else pendingCloses.push(res);
                                });
                
                                overlayDiv.onclick = closeWindow;
                            }
                        });
                    } else ready = true;
                }

                if(currentNotification) {
                    document.body.insertBefore(clone, currentNotification);
                } else {
                    document.body.appendChild(clone);
                }

                anime({
                    targets: clone,
                    right: [right, (window.innerWidth/2) - (buttonBounds.width/2)],
                    top: [top, (window.innerHeight/2) - (buttonBounds.height/2)],
                    easing: `easeOutCirc`,
                    duration: 350,
                });

                anime({
                    targets: clone,
                    scale: window.innerWidth / (buttonBounds.width+2),
                    opacity: 0,
                    easing: `easeInExpo`,
                    duration: 350,
                    complete: secondaryAnimation
                });

                let loads = 0;

                h.onload = () => {
                    h.onload = () => {
                        loads++;

                        console.log(`iframe loaded (${loads})`);

                        if(closeOnNavigate && loads > 1) {
                            console.log(`navigation detected & closeOnNavigate is true; closing`)
                            return closeWindow();
                        } else if(closeOnNavigate) console.log(`navigation detected (${loads}) & closeOnNavigate is true; not closing`)

                        h.contentWindow.config = config;

                        h.contentWindow.repositionNotifications = (...c) => repositionNotifications(...c);
                        h.contentWindow.addNotification = (...c) => repositionNotifications(...c);
                        h.contentWindow.createNotification = (...c) => createNotification(...c);

                        h.contentWindow.rawAnimeFunc = typeof rawAnimeFunc != `undefined` ? rawAnimeFunc : anime;

                        h.contentWindow.useHref = typeof useHref != `undefined` ? useHref : closeOnNavigate;
                        h.contentWindow.console.log = (...content) => console.log(`iframe ${name}:`, ...content);

                        const embedHref = h.contentWindow.location.href.split(`/`).slice(0, -1)[0].split(`?`)[0];

                        const heading = embedHref[0].toUpperCase() + embedHref.slice(1).split(`.`).slice(0, -1).join(`.`)

                        const headingTxt = document.createElement(`h1`);
    
                        headingTxt.style.padding = `24px`;
                        headingTxt.style.width = `100vw`;
                        
                        headingTxt.classList.add(`ez-text`)

                        headingTxt.innerText = o.heading || heading;

                        h.contentWindow.document.body.prepend(headingTxt);

                        const onclickFunc = e => {
                            const test = (target, depth=0) => {
                                console.log(`iframe click (depth ${depth}): ${target.onclick ? `onclick func` : target.href ? `link` : `no redirection`} / closeOnNavigate: ${closeOnNavigate}`, e)
                                if(target.href || target.onclick) {
                                    if(target.href && genericURLRegex.test(target.href.split(`?`)[0])) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log(`redirecting window to "${target.href}"`)
                                        window.location.href = target.href;
                                    } else if(closeOnNavigate) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        closeWindow();
                                    } else if(target.href) navigateEvent(e, target.href);
                                } else if(target.parentElement && target.parentElement != h.contentWindow.document.body) test(target.parentElement, depth+1);
                            }
    
                            test(e.target)
                        }

                        h.contentWindow.document.onclick = onclickFunc;
                    };

                    h.onload();

                    secondaryAnimation();
                }

                anime.remove(overlayDiv);

                anime({
                    targets: overlayDiv,
                    backgroundColor: `rgba(0,0,0,${closeable ? 0.6 : 1})`,
                    duration: 500,
                    easing: `easeOutExpo`,
                });

                clone.after(overlayDiv);

                applyStyle(h);

                h.style.position = `fixed`;

                h.style.left = null;

                h.style.opacity = 0;

                h.style.top = `${offsetPx/2}px`;
                h.style.right = `${offsetPx/2}px`

                h.style.width = `calc(100vw - ${offsetPx}px)`;
                h.style.height = `calc(100vh - ${offsetPx}px)`;

                h.style.backgroundColor = `rgb(10,10,10)`;

                h.style.borderRadius = `24px`

                overlayDiv.after(h);
                h.after(overlayCloseText);
            }
        }

        if(addEventListeners) button.addEventListener(`click`, click);

        parsedButtons.push({
            name,
            button,
            click
        })
    };

    return {
        close: () => closeWindow(),
        frame: () => frame,
        setCloseable: (val) => setCloseable(val),
        buttons: parsedButtons,
        divs,
    }
}
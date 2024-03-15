import { DefineComponent, FunctionalComponent, PropType, defineComponent } from 'vue';
import { JSX } from 'vue/jsx-runtime';

export type KsNode = KsElement | KsText
export type KsDocument = KsNode[];

type Mark =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'superscript'
    | 'subscript'
    | 'keyboard'

interface KsElement {
    children: KsNode[]
    [key: string]: unknown
}

interface KsText {
    text: string
    [key: string]: unknown
}

type Component<P> = FunctionalComponent<P> | DefineComponent<P>

type OnlyChildrenComponent = Component<{ children: JSX.Element[] }> | keyof JSX.IntrinsicElements

type MarkRenderers = { [Key in Mark]: OnlyChildrenComponent }

export interface Renderers {
    inline: {
        link: Component<{ children: JSX.Element, href: string }> | 'a'
        relationship: Component<{
            relationship: string
            data: { id: string, label: string | undefined, data: Record<string, any> | undefined } | null
        }>
    } & MarkRenderers
    block: {
        block: Component<{ children: JSX.Element[], className: string }> | keyof JSX.IntrinsicElements
        paragraph: Component<{ children: JSX.Element[], textAlign: 'center' | 'end' | undefined }>
        blockquote: OnlyChildrenComponent
        code: Component<{ children: string }> | keyof JSX.IntrinsicElements
        layout: Component<{ layout: [number, ...number[]], children: JSX.Element[] }>
        divider: Component<{}> | keyof JSX.IntrinsicElements
        heading: Component<{
            level: 1 | 2 | 3 | 4 | 5 | 6
            children: JSX.Element[]
            textAlign: 'center' | 'end' | undefined
        }>
        list: Component<{ type: 'ordered' | 'unordered', children: JSX.Element[] }>
    }
}

export const defaultRenderers: Renderers = {
    inline: {
        bold: 'strong',
        code: 'code',
        keyboard: 'kbd',
        strikethrough: 's',
        italic: 'em',
        link: 'a',
        subscript: 'sub',
        superscript: 'sup',
        underline: 'u',
        relationship: ({ data }) => {
            return <span>{data?.label || data?.id}</span>
        },
    },
    block: {
        block: 'div',
        blockquote: 'blockquote',
        paragraph: ({ children, textAlign }) => {
            return <p style={{ textAlign }}>{children}</p>
        },
        divider: 'hr',
        heading: ({ level, children, textAlign }) => {
            let Heading = `h${level}` as 'h1'
            return <Heading style={{ textAlign }}>{children}</Heading>;
        },
        code: 'pre',
        list: ({ children, type }) => {
            const List = type === 'ordered' ? 'ol' : 'ul'
            return (
                <List>
                    {children.map((x, i) => (
                        <li key={i}>{x}</li>
                    ))}
                </List>
            )
        },
        layout: ({ children, layout }) => {
            return (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: layout.map(x => `${x}fr`).join(' '),
                    }}
                >
                    {children.map((element, i) => (
                        <div key={i}>{element}</div>
                    ))}
                </div>
            )
        },
    },
}

function DocumentNode({
    node: _node,
    componentBlocks,
    renderers,
}: {
    node: KsElement | KsText
    renderers: Renderers
    // TODO: allow inferring from the component blocks
    componentBlocks: Record<string, Component<any>>
}): JSX.Element {
    if (typeof _node.text === 'string') {
        let child = <>{_node.text}</>;
        (Object.keys(renderers.inline) as (keyof typeof renderers.inline)[]).forEach(markName => {
            if (markName !== 'link' && markName !== 'relationship' && _node[markName]) {
                const Mark = renderers.inline[markName] as string;
                child = <Mark>{child}</Mark>
            }
        })

        return child
    }
    const node = _node as KsElement
    const children = node.children.map((x, i) => (
        <DocumentNode node={x} componentBlocks={componentBlocks} renderers={renderers} key={i} />
    ))
    switch (node.type as string) {
        case 'blockquote': {
            const Mark = renderers.block.blockquote;

            if (typeof Mark === 'string') {
                return <Mark>{children}</Mark>
            } else if (typeof Mark === 'function') {
                return <Mark children={children}>{children}</Mark>
            }

            return <></>;
        }
        case 'paragraph': {
            return <renderers.block.paragraph children={children}
                textAlign={node.textAlign as any}>{
                    children
                }</renderers.block.paragraph>;
        }
        case 'code': {

            if (
                node.children.length === 1 &&
                node.children[0] &&
                typeof node.children[0].text === 'string'
            ) {
                const child = node.children[0] as KsText;
                const childText = child.text;

                const Mark = renderers.block.code;

                if (typeof Mark === 'string') {
                    return <Mark>{childText}</Mark>
                } else if (typeof Mark === 'function') {
                    return <Mark children={childText}>{childText}</Mark>
                }
            }
            break
        }
        case 'layout': {
            return <renderers.block.layout layout={node.layout as any} children={children}>
                {children}
            </renderers.block.layout>
        }
        case 'divider': {
            const Mark = renderers.block.divider;

            if (typeof Mark === 'string' || typeof Mark === 'function') {
                return <Mark />;
            }
            return <></>
        }
        case 'heading': {
            return (
                <renderers.block.heading
                    textAlign={node.textAlign as any}
                    level={node.level as any}
                    children={children}
                >{children}</renderers.block.heading>
            )
        }
        case 'component-block': {
            const Comp = componentBlocks[node.component as string]
            if (Comp) {
                const props = createComponentBlockProps(node, children);

                const Block = renderers.block.block;
                const componentName = (node.component as string).toLowerCase();
                const wrapperClasses = `wrapper-component-block wrapper-component-block-${componentName}`;

                if (typeof Block === 'string') {
                    return <Block><Comp {...props}>{
                        props.children || null
                    }</Comp></Block>
                } else if (typeof Block === 'function') {
                    return <Block className={wrapperClasses} children={
                        [<Comp {...props}>{
                            props.children || null
                        }</Comp>]}>
                    </Block>;
                }
            }
            break
        }
        case 'ordered-list':
        case 'unordered-list': {
            return (
                <renderers.block.list
                    children={children}
                    type={node.type === 'ordered-list' ? 'ordered' : 'unordered'}
                />
            )
        }
        case 'relationship': {
            const data = node.data as any
            return (
                <renderers.inline.relationship
                    relationship={node.relationship as string}
                    data={data ? { id: data.id, label: data.label, data: data.data } : null}
                />
            )
        }
        case 'link': {
            const Mark = renderers.inline.link;
            if (typeof Mark === 'string') {
                return <Mark href={node.href as string}>{ children }</Mark>
            } else if (typeof Mark === 'function') {
                return <Mark children={children[0]}
                    href={node.href as string}>{ children}</Mark>
            }
        }
    }
    return <>{children}</>
}

function set(obj: Record<string, any>, propPath: (string | number)[], value: any) {
    if (propPath.length === 1) {
        obj[propPath[0]] = value
    } else {
        let firstElement = propPath.shift()!
        set(obj[firstElement], propPath, value)
    }
}

function createComponentBlockProps(node: KsElement, children: JSX.Element[]) {
    const formProps = JSON.parse(JSON.stringify(node.props))
    node.children.forEach((child, i) => {
        if (child.propPath) {
            const propPath = [...(child.propPath as any)]
            set(formProps, propPath, children[i])
        }
    })
    return formProps
}

export type DocumentRendererProps<
    ComponentBlocks extends Record<string, Component<any>> = Record<string, Component<any>>
> = {
    document: KsDocument,
    renderers?: { inline?: Partial<Renderers['inline']>, block?: Partial<Renderers['block']> }
    componentBlocks?: ComponentBlocks
}

export function DocumentRenderer<ComponentBlocks extends Record<string, Component<any>>>(
    props: DocumentRendererProps<ComponentBlocks>
) {
    const renderers = {
        inline: { ...defaultRenderers.inline, ...props.renderers?.inline },
        block: { ...defaultRenderers.block, ...props.renderers?.block },
    }
    const componentBlocks = props.componentBlocks || {}
    return (
        <>
            {props.document.map((x, i) => (
                <DocumentNode node={x} componentBlocks={componentBlocks} renderers={renderers} key={i} />
            ))}
        </>
    )
}
export default defineComponent({

    render() {
        const renderers = {
            inline: { ...defaultRenderers.inline, ...this.$props.renderers?.inline },
            block: { ...defaultRenderers.block, ...this.$props.renderers?.block }
        };

        const componentBlocks = this.$props.componentBlocks ?? {};

        return this.$props.document.map((x, i) => {
            return <DocumentNode node={x}
                componentBlocks={componentBlocks}
                renderers={renderers}
                key={i} />
        });
    },
    props: {
        document: {
            type: Object as PropType<DocumentRendererProps['document']>,
            required: true
        },
        renderers: {
            type: Object as PropType<DocumentRendererProps['renderers']>
        },
        componentBlocks: {
            type: Object as PropType<DocumentRendererProps['componentBlocks']>
        }
    }
})

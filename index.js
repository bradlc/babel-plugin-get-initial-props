module.exports = function(babel) {
  const { types: t } = babel

  return {
    visitor: {
      ClassMethod(path) {
        if (path.node.key.name !== 'getInitialProps') return

        const program = path.findParent(node => node.isProgram())
        const loadableIdentifier = program.scope.generateUidIdentifier(
          'Loadable'
        )

        const c = path.findParent(path => path.isClassDeclaration())
        if (!c) return
        const originalClassName = c.node.id.name
        const classId = c.scope.generateUidIdentifier(originalClassName).name
        c.node.id.name = classId

        const obj = [
          t.objectProperty(
            t.identifier('loader'),
            t.arrowFunctionExpression([], path.node.body)
          )
        ]

        path.container.forEach((node, i) => {
          if (node.type === 'ClassMethod' && node.key.name === 'loading') {
            // loading component
            const fn = path.getSibling(i)
            const loading = t.arrowFunctionExpression(
              fn.node.params,
              fn.node.body
            )
            obj.push(t.objectProperty(t.identifier('loading'), loading))
            fn.remove()
          }
        })

        const attrs = [
          t.jSXSpreadAttribute(t.identifier('props')),
          t.jSXSpreadAttribute(t.identifier('loaded'))
        ]
        const component = t.jSXElement(
          t.jSXOpeningElement(t.jSXIdentifier(classId), attrs, true),
          null,
          [],
          true
        )
        const ret = t.returnStatement(component)
        obj.push(
          t.objectMethod(
            'method',
            t.identifier('render'),
            [t.identifier('loaded'), t.identifier('props')],
            t.blockStatement([ret])
          )
        )

        const loadable = t.callExpression(loadableIdentifier, [
          t.objectExpression(obj)
        ])
        c.insertAfter(
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(originalClassName), loadable)
          ])
        )
        path.remove()

        // 'react-loadable' import
        program.unshiftContainer(
          'body',
          t.importDeclaration(
            [t.importDefaultSpecifier(loadableIdentifier)],
            t.stringLiteral('react-loadable')
          )
        )
      }
    }
  }
}

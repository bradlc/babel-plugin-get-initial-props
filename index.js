module.exports = function(babel) {
  const { types: t } = babel

  return {
    visitor: {
      ClassDeclaration(classPath) {
        let getInitialProps
        let loadingComponent

        classPath
          .get('body')
          .get('body')
          .forEach(path => {
            if (!path.node || !path.node.key) return
            if (path.node.key.name === 'getInitialProps') {
              getInitialProps = path
            } else if (path.node.key.name === 'loading') {
              loadingComponent = path
            }
          })

        if (!getInitialProps) return

        const program = classPath.findParent(node => node.isProgram())
        const loadableIdentifier = program.scope.generateUidIdentifier(
          'Loadable'
        )

        const originalClassName = classPath.node.id.name
        const classId = classPath.scope.generateUidIdentifier(originalClassName)
          .name
        classPath.node.id.name = classId

        const obj = [
          t.objectProperty(
            t.identifier('loader'),
            t.arrowFunctionExpression([], getInitialProps.node.body)
          )
        ]

        if (loadingComponent) {
          const loading = t.arrowFunctionExpression(
            loadingComponent.node.params,
            loadingComponent.node.body
          )
          obj.push(t.objectProperty(t.identifier('loading'), loading))
          loadingComponent.remove()
        } else {
          const loading = t.arrowFunctionExpression([], t.nullLiteral())
          obj.push(t.objectProperty(t.identifier('loading'), loading))
        }

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
        classPath.insertAfter(
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(originalClassName), loadable)
          ])
        )
        getInitialProps.remove()

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

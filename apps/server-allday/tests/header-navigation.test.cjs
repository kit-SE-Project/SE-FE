const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { transformSync } = require('@babel/core');

const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/components/AppHeader.jsx'), 'utf8'), {
  configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});

function renderHeader(width, integrated = true, platform = 'web') {
  let rentalVisits = 0;
  const module = { exports: {} };
  const localRequire = name => {
    if (name === 'react') return { __esModule: true, default: React, useState: () => [null, () => {}], useEffect: () => {} };
    if (name === 'react-native') return {
      Platform: { OS: platform }, View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', useWindowDimensions: () => ({ width }),
    };
    if (name === './BrandLogo') return { __esModule: true, default: 'BrandLogo' };
    if (name === './ui') return { Icon: 'Icon' };
    if (name === '../api') return { nicknameForMember: () => '' };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  const tree = module.exports.default({
    actor: { memberId: 1 }, onRent: () => rentalVisits++,
    onBoardHome: integrated ? () => {} : undefined, onSignOut: () => {},
  });
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : React.isValidElement(node) ? [node, ...nodes(node.props.children)] : [];
  const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : typeof node === 'string' ? node : '';
  return { nodes: nodes(tree), text, rentalVisits: () => rentalVisits };
}

for (const width of [1440, 375]) {
  test(`integrated header at ${width}px links to actual SE boards instead of rental routes`, () => {
    const view = renderHeader(width);
    const links = view.nodes.filter(node => node.props.href);
    assert.deepEqual(Object.fromEntries(links.map(node => [view.text(node), node.props.href])), {
      '공지사항': '/notice', '자유게시판': '/freeboard',
      '학사': 'https://www.kumoh.ac.kr/ko/sub06_01_01_01.do',
      '채용': 'https://cs.kumoh.ac.kr/cs/sub0602.do',
      'SE 건의사항': '/df883bcb', '서버대여': '/server-reservation', 'Project & Job': '/recruit',
    });
    for (const link of links) {
      assert.equal(link.type, 'a');
      if (['학사', '채용'].includes(view.text(link))) {
        assert.equal(link.props.target, '_blank');
        assert.equal(link.props.rel, 'noopener noreferrer');
      } else {
        assert.equal(link.props.target, undefined);
        assert.ok(link.props.href.startsWith('/'));
        assert.ok(!link.props.href.startsWith('/allday'));
      }
    }
    assert.equal(view.nodes.some(node => node.props.testID === 'header-rental-tab'), false);
  });
}

test('web navigation remains enabled without the SSO home callback', () => {
  const view = renderHeader(1440, false);
  const links = view.nodes.filter(node => node.type === 'a');
  assert.equal(links.length, 7);
  assert.equal(links.find(node => view.text(node) === '서버대여').props.href, '/server-reservation');
});

test('native header preserves its rental action without web-only board links', () => {
  const view = renderHeader(1440, false, 'android');
  assert.equal(view.nodes.filter(node => node.props.href).length, 0);
  const rental = view.nodes.find(node => node.props.testID === 'header-rental-tab');
  rental.props.onPress();
  assert.equal(view.rentalVisits(), 1);
  assert.equal(rental.props.accessibilityState.selected, true);
});

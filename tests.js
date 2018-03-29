/* global require */

var assert = require("assert");
var recast = require("recast");
var estraverse = require("estraverse");
var brickEditor = require("./brick-editor.js");

function assertEqual(actual, expected, msg) {
    assert(
        expected === actual,
        msg + "; expected " + expected + " but got " + actual
    );
}

function checkASTPosition(node, type, start_line, start_col, end_line, end_col) {
    // check if node is supposed to be null
    if (node == null) {
        assertEqual(node, type);
    } else {
        assertEqual(node.type, type, "Block type is wrong");
        assertEqual(node.loc.start.line, start_line, "Start line is wrong");
        assertEqual(node.loc.start.column, start_col, "Start line is wrong");
        assertEqual(node.loc.end.line, end_line, "End line is wrong");
        assertEqual(node.loc.end.column, end_col, "End column is wrong");
    } 
}

function testClosestParentNearBraces() {
    var ast = recast.parse([
        "function log(s) {",
        "    console.log(s);",
        "}",
    ].join("\n"));
    var position = null;
    var parentNode = null;

    // after function definition
    position = {"lineNumber": 3, "column": 1};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "Program", 1, 0, 3, 1);

    // before function definition
    position = {"lineNumber": 1, "column": 0};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "Program", 1, 0, 3, 1);

    // before function open brace
    position = {"lineNumber": 1, "column": 16};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 3, 1);

    // after function open brace
    position = {"lineNumber": 1, "column": 17};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 3, 1);

    // before function close brace
    position = {"lineNumber": 3, "column": 0};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 3, 1);
}

function testClosestParentMultipleLines() {
    var ast = recast.parse([
        "function log(s) {",
        "    console.log(1);",
        "    console.log(2);",
        "    console.log(3);",
        "}",
    ].join("\n"));
    var position = null;
    var parentNode = null;

    // before first line
    position = {"lineNumber": 2, "column": 4};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 5, 1);

    // after last line
    position = {"lineNumber": 4, "column": 19};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 5, 1);

    // before second line
    position = {"lineNumber": 3, "column": 4};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 5, 1);

    // after second line
    position = {"lineNumber": 3, "column": 19};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 5, 1);

    // in variable
    position = {"lineNumber": 3, "column": 7};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 5, 1);

    // in function call
    position = {"lineNumber": 3, "column": 17};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 5, 1);
}

function testClosestParentNested() {
    var ast = recast.parse([
        "function log(s) {",
        "    console.log(1);",
        "    console.log(1);",
        "    console.log(1);",
        "    while (True) {",
        "        console.log(2);",
        "        console.log(2);",
        "        console.log(2);",
        "        if (s === null) {",
        "            console.log(3);",
        "            console.log(3);",
        "            console.log(3);",
        "        } else {",
        "            console.log(4);",
        "            console.log(4);",
        "            console.log(4);",
        "        }",
        "    }",
        "    console.log(5);",
        "    console.log(5);",
        "    console.log(5);",
        "}",
    ].join("\n"));
    var position = null;
    var parentNode = null;

    // in while keyword
    position = {"lineNumber": 5, "column": 7};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 22, 1);

    // in while condition
    position = {"lineNumber": 5, "column": 12};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 1, 16, 22, 1);

    // in while block
    position = {"lineNumber": 6, "column": 17};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 5, 17, 18, 5);

    // in if keyword
    position = {"lineNumber": 9, "column": 9};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 5, 17, 18, 5);

    // in if condition
    position = {"lineNumber": 9, "column": 16};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 5, 17, 18, 5);

    // in if true block
    position = {"lineNumber": 12, "column": 25};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 9, 24, 13, 9);

    // in if false block
    position = {"lineNumber": 14, "column": 3};
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 13, 15, 17, 9);

    var ast = recast.parse([
        'function Person(age) {',
        '    if (age) {',
        '        this.age = age;',
        '    }',
        '}'].join('\n'));

    position = { "lineNumber": 3, "column": 23 };
    parentNode = brickEditor.findClosestParent(ast, position);
    checkASTPosition(parentNode, "BlockStatement", 2, 13, 4, 5);
}

function testFindPreviousSibling() {
    var ast = recast.parse([
        'function test(a) {',
        '    var a = 3;',
        '    if (a == 3) {',
        '        print(5);',
        '    } else {',
        '            ',
        '    }',
        '    return a;',
        '}'].join('\n'));
    var position = null;
    var prevSibling = null;

    // after opening curly brace
    position = { "lineNumber": 1, "column": 18 };
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, null);

    // before var a = 3
    position = { "lineNumber": 2, "column": 4 };
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, null);

    // after var a = 3
    position = { "lineNumber": 2, "column": 14 };
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, "VariableDeclaration", 2, 4, 2, 14);

    // before print(5)
    position = { "lineNumber": 4, "column": 4 };
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, null);

    // after print(5)
    position = { "lineNumber": 4, "column": 17 };
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, "ExpressionStatement", 4, 8, 4, 17);

    // in empty line in else statement
    position = { "lineNumber": 6, "column": 12 };
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, null);

    // after closing curly brace of else statement
    position = { "lineNumber": 7, "column": 5};
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, "IfStatement", 3, 4, 7, 5);

    // after closing curly brace of function
    position = { "lineNumber": 9, "column": 1 };
    prevSibling = brickEditor.findPreviousSibling(ast, position);
    checkASTPosition(prevSibling, "FunctionDeclaration", 1, 0, 9, 1);
}


testClosestParentNearBraces();
testClosestParentMultipleLines();
testClosestParentNested();
testFindPreviousSibling();

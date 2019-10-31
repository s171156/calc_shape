// 'use strict';

document.addEventListener('DOMContentLoaded', () => {

    var btn_s = document.getElementById('btn_s');
    var equation = document.getElementById('equation');
    var result_equation = document.getElementById('result_equation');
    var result_solution = document.getElementById('result_solution');

    //数式を取得
    btn_s.addEventListener('click', () => {
        //数式内の全角文字を半角文字へ変換
        var equation_hankaku = zenkaku2hankaku(equation.value);
        //数式内の％などを変換
        var equation_shaped = shaping(equation_hankaku);
        //結果をresult_equationに表示
        show_equation(equation_shaped);
        //整形後の数式をクリップボードへコピー
        var copy_target = document.getElementById('equation_shaped');
        execCopy(copy_target.innerHTML);
        equation.value = "";
        //整形後の数式の解を求める
        var solution = calc(equation_shaped);
        //結果をresult_solutionに表示
        show_solution(solution);
    });

    // 入力値の全角を半角の文字に置換
    function zenkaku2hankaku(val) {
        var value;
        var regex = /[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝]/g;
        value = val
            .replace(regex, function (s) {
                return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
            })
            .replace(/[‐－―]/g, "-")
            .replace(/[～〜]/g, "~")
            .replace(/　/g, " ");
        return value;
    }

    //文字列を挿入
    function strIns(str, idx, val) {
        var res = str.slice(0, idx) + val + str.slice(idx);
        return res;
    };

    //文字列を削除
    function strDel(str, idx) {
        var res = str.slice(0, idx) + str.slice(idx + 1);
        return res;
    };

    //数式を整形
    var shaping = (val) => {
        var temp;
        val = val.replace(/□/g, 'x');
        val = val.replace(/×/g, '*');
        val = val.replace(/%/g, '*1/100');
        val = val.replace(/の/g, '*');


        //割り算記号の後の分数を逆数に変換
        //割り算記号を掛け算記号へ変換
        var num = val.indexOf('÷');
        if (num != -1 && val[num + 2] == '/') {
            val = val.replace(/÷/g, '*');
            var numerator = val[num + 1];
            var denominator = val[num + 3];
            temp = strIns(val, num + 1, denominator);
            temp = strDel(temp, num + 2);
            temp = strIns(temp, num + 3, numerator);
            temp = strDel(temp, num + 4);
            temp = temp.replace(/÷/g, '/');
            return temp;
        }

        val = val.replace(/÷/g, '/');

        //'x'と'='が含まれない時の整形
        if (val.indexOf('=') == -1) {
            val = strIns(val, val.length, '=x')
            return val;
        } else if (val.indexOf('x') == -1) {
            val = strIns(val, val.length, 'x')
            console.log(val.length)
            return val;

        }
        return val;
    }

    //整形後の数式を記述
    var show_equation = (equation_shaped) => {
        var p = document.createElement('p');
        var equation_shaped = document.createTextNode(equation_shaped);
        //result_areaを初期化
        while (result_equation.firstChild) {
            result_equation.removeChild(result_equation.firstChild);
        }
        result_equation.appendChild(p);
        p.appendChild(equation_shaped);
        p.setAttribute('id', 'equation_shaped')
    }

    var show_solution = (solution) => {
        var p1 = document.createElement('p')
        var solution = document.createTextNode(solution);
        //result_areaを初期化
        while (result_solution.firstChild) {
            result_solution.removeChild(result_solution.firstChild);
        }
        result_solution.appendChild(p1);
        p1.appendChild(solution);
        p1.setAttribute('id', 'solution')
    }

    //コピーボタンの処理
    function execCopy(string) {
        var tmp = document.createElement("div");
        var pre = document.createElement('pre');
        pre.style.webkitUserSelect = 'auto';
        pre.style.userSelect = 'auto';
        tmp.appendChild(pre).textContent = string;
        var s = tmp.style;
        s.position = 'fixed';
        s.right = '200%';
        document.body.appendChild(tmp);
        document.getSelection().selectAllChildren(tmp);
        var result = document.execCommand("copy");
        document.body.removeChild(tmp);
        return result;
    }

    //整形後の数式の計算
    function extend(d, s) { for (var p in s) d[p] = s[p]; }

    function calc(source) {
        var sides = source.split('=');
        return solve(parse(sides[0]), parse(sides[1]));
    }

    /** 数式パーサ */
    var parse = function (source) {
        var unary = { '+': 1, '-': 1 }, binary = { '+': 1, '-': 1, '*': 2, '/': 2 };
        var tokens = source.match(/x|\d+(?:\.\d+)?(?:e\d+)?|[-+*/()]/ig);
        return (function parseGroup(index, end) {
            var stack = [];
            while (index < end) {
                var operand = (function parseUnary(token) {
                    if (unary[token]) {
                        return new UnaryOperation(token, parseUnary(tokens[index++]));
                    } else if (token == '(') {
                        var depth = 0, start = index;
                        while (token = tokens[index++]) {
                            if (token == '(') depth++;
                            else if ((token == ')') && !depth--)
                                return parseGroup(start, index - 1);
                        }
                    } else {
                        return isNaN(token) ? new Unknown(token) : new Fraction(token);
                    }
                })(tokens[index++]);

                var operator = tokens[index++], precedence = binary[operator] || 0;
                while (stack.length && precedence <= binary[stack[0]])
                    operand = new BinaryOperation(stack.shift(), stack.shift(), operand);
                stack.unshift(operator, operand);
            }
            return stack.pop();
        })(0, tokens.length);
    };

    /** 一元一次方程式を解く */
    var solve = function (left, right) {
        var hasLeftX = left.hasX();
        if (!hasLeftX == !right.hasX()) throw 'Error';    //XXX
        var variable = hasLeftX ? left : right;
        var constant = (hasLeftX ? right : left).operate();

        switch (variable.type) {
            case 'Atomic':
                return constant;
            case 'Unary':
                return solve(variable.operand, new UnaryOperation(variable.operator, constant));
            case 'Binary':
                var canceler = ({ '+': '-', '-': '+', '*': '/', '/': '*' })[variable.operator];
                switch (canceler) {
                    case '+': case '*':
                        return solve(variable.operand1, new BinaryOperation(canceler, variable.operand2, constant));
                    case '-': case '/':
                        return solve(variable.operand1, new BinaryOperation(canceler, constant, variable.operand2));
                }
        }
    };


    /** 分数クラス */
    var Fraction = function (num, den) {
        var isFraction = num instanceof arguments.callee;
        this.num = Number(isFraction ? num.num : num || 0);
        this.den = Number(isFraction ? num.den : den || 1);
        this.reduce();
    };

    extend(Fraction.prototype, {
        valueOf: function () { return this.num / this.den; },
        toString: function () { return this.num + ' / ' + this.den; },
        /** 約分 */
        reduce: function () {
            var num = Math.abs(this.num), den = Math.abs(this.den);
            if (!isFinite(num) || !isFinite(den) || den === 0) throw 'Error';    //XXX
            if (num) {
                var sign = this.num / num * this.den / den;
                while ((num % 1) || (den % 1)) { num *= 10; den *= 10; }    //整数化
                var r, m = Math.max(num, den), n = Math.min(num, den);    //互除法
                while (r = m % n) { m = n; n = r; }
                this.num = sign * num / n;
                this.den = den / n;
            } else {
                this.num = 0;
                this.den = 1;
            }
            return this;
        },
        /** 加算 */
        add: function (n) {
            n = new Fraction(n);

            this.num = this.num * n.den + n.num * this.den;
            this.den *= n.den;

            return this.reduce();
        },
        /** 減算 */
        subtract: function (n) {
            n = new Fraction(n);

            this.num = this.num * n.den - n.num * this.den;
            this.den *= n.den;

            return this.reduce();
        },
        /** 乗算 */
        multiply: function (n) {
            n = new Fraction(n);

            this.num *= n.num;
            this.den *= n.den;

            return this.reduce();
        },
        /** 除算 */
        divide: function (n) {
            n = new Fraction(n);

            this.num *= n.den;
            this.den *= n.num;

            return this.reduce();
        }
    });


    /** 単項演算クラス */
    var UnaryOperation = function (operator, operand) {
        this.operator = operator;
        this.operand = operand;
    };

    extend(UnaryOperation.prototype, {
        type: 'Unary',
        hasX: function () { return this.operand.hasX(); },
        operate: function () {
            switch (this.operator) {
                case '-':
                    return this.operand.operate()['*'](-1);
                case '+':
                default:
                    return this.operand.operate();
            }
        }
    });


    /** 二項演算クラス */
    var BinaryOperation = function (operator, operand1, operand2) {
        this.operator = operator;
        this.operand1 = operand1;
        this.operand2 = operand2;
    };

    extend(BinaryOperation.prototype, {
        type: 'Binary',
        hasX: function () { return this.operand1.hasX() || this.operand2.hasX(); },
        operate: function () { return this.operand1.operate()[this.operator](this.operand2.operate()); }
    });


    /** 未知数クラス */
    var Unknown = function (name) { this.name = name; };
    extend(Unknown.prototype, {
        type: 'Atomic',
        hasX: function () { return true; },
        operate: function () { throw 'This is an Unknown Value.'; }
    });


    /** 分数クラスを拡張 */
    extend(Fraction.prototype, {
        '+': Fraction.prototype.add,
        '-': Fraction.prototype.subtract,
        '*': Fraction.prototype.multiply,
        '/': Fraction.prototype.divide,
        type: 'Atomic',
        hasX: function () { return false; },
        operate: function () { return this; }
    });

});
